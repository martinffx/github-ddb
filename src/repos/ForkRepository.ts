import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
	ConditionCheck,
	DeleteItemCommand,
	DynamoDBToolboxError,
	GetItemCommand,
	QueryCommand,
} from "dynamodb-toolbox";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import type {
	GithubTable,
	ForkRecord,
	RepoRecord,
	ForkFormatted,
} from "./schema";
import { ForkEntity } from "../services/entities/ForkEntity";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

export class ForkRepository {
	private readonly table: GithubTable;
	private readonly forkRecord: ForkRecord;
	private readonly repoRecord: RepoRecord;

	constructor(
		table: GithubTable,
		forkRecord: ForkRecord,
		repoRecord: RepoRecord,
	) {
		this.table = table;
		this.forkRecord = forkRecord;
		this.repoRecord = repoRecord;
	}

	/**
	 * Create a new fork with transaction to validate both repos exist
	 * Uniqueness is enforced via composite key: original repo + fork owner
	 */
	async create(fork: ForkEntity): Promise<ForkEntity> {
		try {
			// Build transaction to put fork with duplicate check
			const putForkTransaction = this.forkRecord
				.build(PutTransaction)
				.item(fork.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition checks to verify both repos exist
			const [sourceCheck, targetCheck] = this.buildRepoCheckTransactions(
				fork.originalOwner,
				fork.originalRepo,
				fork.forkOwner,
				fork.forkRepo,
			);

			// Execute all in a transaction
			await execute(putForkTransaction, sourceCheck, targetCheck);

			// If successful, fetch the created item
			const created = await this.get(
				fork.originalOwner,
				fork.originalRepo,
				fork.forkOwner,
			);

			if (!created) {
				throw new Error("Failed to retrieve created fork");
			}

			return created;
		} catch (error: unknown) {
			this.handleForkCreateError(error, fork);
		}
	}

	/**
	 * Custom error handler for fork creation with 3-transaction validation
	 * Transaction 0: Put fork (duplicate check)
	 * Transaction 1: Check source repo exists
	 * Transaction 2: Check target repo exists
	 */
	private handleForkCreateError(error: unknown, fork: ForkEntity): never {
		if (error instanceof TransactionCanceledException) {
			const reasons = error.CancellationReasons || [];

			// Fork creation has 3 transactions
			if (reasons.length < 3) {
				throw new ValidationError(
					"transaction",
					`Transaction failed with unexpected cancellation reason count: ${reasons.length}`,
				);
			}

			// First transaction is the fork put (duplicate check)
			if (reasons[0]?.Code === "ConditionalCheckFailed") {
				throw new DuplicateEntityError("Fork", fork.getEntityKey());
			}

			// Second transaction is the source repo check
			if (reasons[1]?.Code === "ConditionalCheckFailed") {
				throw new EntityNotFoundError(
					"RepositoryEntity",
					`REPO#${fork.originalOwner}#${fork.originalRepo}`,
				);
			}

			// Third transaction is the target repo check
			if (reasons[2]?.Code === "ConditionalCheckFailed") {
				throw new EntityNotFoundError(
					"RepositoryEntity",
					`REPO#${fork.forkOwner}#${fork.forkRepo}`,
				);
			}

			// Fallback for unknown transaction failure
			throw new ValidationError(
				"fork",
				`Failed to create fork due to transaction conflict: ${reasons.map((r) => r.Code).join(", ")}`,
			);
		}
		if (error instanceof DynamoDBToolboxError) {
			throw new ValidationError(error.path ?? "fork", error.message);
		}
		throw error;
	}

	/**
	 * Get a specific fork by original repo and fork owner
	 */
	async get(
		originalOwner: string,
		originalRepo: string,
		forkOwner: string,
	): Promise<ForkEntity | undefined> {
		const result = await this.forkRecord
			.build(GetItemCommand)
			.key({
				original_owner: originalOwner,
				original_repo: originalRepo,
				fork_owner: forkOwner,
			})
			.send();

		return result.Item ? ForkEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * Delete a fork
	 */
	async delete(
		originalOwner: string,
		originalRepo: string,
		forkOwner: string,
	): Promise<void> {
		await this.forkRecord
			.build(DeleteItemCommand)
			.key({
				original_owner: originalOwner,
				original_repo: originalRepo,
				fork_owner: forkOwner,
			})
			.send();
	}

	/**
	 * List all forks of a repository using GSI2
	 * Uses partition by original repo, range begins_with "FORK#"
	 */
	async listForksOfRepo(
		owner: string,
		repoName: string,
	): Promise<ForkEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.forkRecord)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				index: "GSI2",
				range: { beginsWith: "FORK#" },
			})
			.send();

		return (
			result.Items?.map((item) =>
				ForkEntity.fromRecord(item as ForkFormatted),
			) || []
		);
	}

	/**
	 * Private helper to build repository existence check transactions
	 * Validates both source and target repositories exist
	 */
	private buildRepoCheckTransactions(
		sourceOwner: string,
		sourceRepo: string,
		targetOwner: string,
		targetRepo: string,
	): [
		ConditionCheck<typeof this.repoRecord>,
		ConditionCheck<typeof this.repoRecord>,
	] {
		// Check source repository exists
		const sourceCheck = this.repoRecord
			.build(ConditionCheck)
			.key({
				owner: sourceOwner,
				repo_name: sourceRepo,
			})
			.condition({ attr: "PK", exists: true });

		// Check target repository exists
		const targetCheck = this.repoRecord
			.build(ConditionCheck)
			.key({
				owner: targetOwner,
				repo_name: targetRepo,
			})
			.condition({ attr: "PK", exists: true });

		return [sourceCheck, targetCheck];
	}
}
