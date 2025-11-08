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
	StarRecord,
	UserRecord,
	RepoRecord,
	StarFormatted,
} from "./schema";
import { StarEntity } from "../services/entities/StarEntity";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

export class StarRepository {
	private readonly table: GithubTable;
	private readonly starRecord: StarRecord;
	private readonly userRecord: UserRecord;
	private readonly repoRecord: RepoRecord;

	constructor(
		table: GithubTable,
		starRecord: StarRecord,
		userRecord: UserRecord,
		repoRecord: RepoRecord,
	) {
		this.table = table;
		this.starRecord = starRecord;
		this.userRecord = userRecord;
		this.repoRecord = repoRecord;
	}

	/**
	 * Create a new star with transaction to validate user and repo exist
	 * Uniqueness is enforced via composite key: username + repo
	 */
	async create(star: StarEntity): Promise<StarEntity> {
		try {
			// Build transaction to put star with duplicate check
			const putStarTransaction = this.starRecord
				.build(PutTransaction)
				.item(star.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition checks to verify user and repo exist
			const [userCheck, repoCheck] = this.buildValidationTransactions(
				star.username,
				star.repoOwner,
				star.repoName,
			);

			// Execute all in a transaction
			await execute(putStarTransaction, userCheck, repoCheck);

			// If successful, fetch the created item
			const created = await this.get(
				star.username,
				star.repoOwner,
				star.repoName,
			);

			if (!created) {
				throw new Error("Failed to retrieve created star");
			}

			return created;
		} catch (error: unknown) {
			this.handleStarCreateError(error, star);
		}
	}

	/**
	 * Custom error handler for star creation with 3-transaction validation
	 * Transaction 0: Put star (duplicate check)
	 * Transaction 1: Check user exists
	 * Transaction 2: Check repository exists
	 */
	private handleStarCreateError(error: unknown, star: StarEntity): never {
		if (error instanceof TransactionCanceledException) {
			const reasons = error.CancellationReasons || [];

			// Star creation has 3 transactions
			if (reasons.length < 3) {
				throw new ValidationError(
					"transaction",
					`Transaction failed with unexpected cancellation reason count: ${reasons.length}`,
				);
			}

			// First transaction is the star put (duplicate check)
			if (reasons[0]?.Code === "ConditionalCheckFailed") {
				throw new DuplicateEntityError("Star", star.getEntityKey());
			}

			// Second transaction is the user check
			if (reasons[1]?.Code === "ConditionalCheckFailed") {
				throw new EntityNotFoundError("UserEntity", `ACCOUNT#${star.username}`);
			}

			// Third transaction is the repository check
			if (reasons[2]?.Code === "ConditionalCheckFailed") {
				throw new EntityNotFoundError(
					"RepositoryEntity",
					`REPO#${star.repoOwner}#${star.repoName}`,
				);
			}

			// Fallback for unknown transaction failure
			throw new ValidationError(
				"star",
				`Failed to create star due to transaction conflict: ${reasons.map((r) => r.Code).join(", ")}`,
			);
		}
		if (error instanceof DynamoDBToolboxError) {
			throw new ValidationError(error.path ?? "star", error.message);
		}
		throw error;
	}

	/**
	 * Get a specific star by username and repo
	 */
	async get(
		username: string,
		repoOwner: string,
		repoName: string,
	): Promise<StarEntity | undefined> {
		const result = await this.starRecord
			.build(GetItemCommand)
			.key({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			})
			.send();

		return result.Item ? StarEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * Delete a star
	 */
	async delete(
		username: string,
		repoOwner: string,
		repoName: string,
	): Promise<void> {
		await this.starRecord
			.build(DeleteItemCommand)
			.key({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			})
			.send();
	}

	/**
	 * List all stars by a user
	 * Uses PK exact match + SK begins_with "STAR#"
	 */
	async listStarsByUser(username: string): Promise<StarEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.starRecord)
			.query({
				partition: `ACCOUNT#${username}`,
				range: { beginsWith: "STAR#" },
			})
			.send();

		return (
			result.Items?.map((item) =>
				StarEntity.fromRecord(item as StarFormatted),
			) || []
		);
	}

	/**
	 * Check if a user has starred a repository
	 */
	async isStarred(
		username: string,
		repoOwner: string,
		repoName: string,
	): Promise<boolean> {
		const star = await this.get(username, repoOwner, repoName);
		return star !== undefined;
	}

	/**
	 * Private helper to build user and repository existence check transactions
	 * Validates both user and repository exist
	 */
	private buildValidationTransactions(
		username: string,
		repoOwner: string,
		repoName: string,
	): [
		ConditionCheck<typeof this.userRecord>,
		ConditionCheck<typeof this.repoRecord>,
	] {
		// Check user exists
		const userCheck = this.userRecord
			.build(ConditionCheck)
			.key({
				username,
			})
			.condition({ attr: "PK", exists: true });

		// Check repository exists
		const repoCheck = this.repoRecord
			.build(ConditionCheck)
			.key({
				owner: repoOwner,
				repo_name: repoName,
			})
			.condition({ attr: "PK", exists: true });

		return [userCheck, repoCheck];
	}
}
