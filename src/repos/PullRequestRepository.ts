import {
	ConditionalCheckFailedException,
	TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
	ConditionCheck,
	DeleteItemCommand,
	DynamoDBToolboxError,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	UpdateItemCommand,
	$add,
} from "dynamodb-toolbox";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import type {
	GithubTable,
	PullRequestRecord,
	CounterRecord,
	RepoRecord,
	PullRequestFormatted,
} from "./schema";
import { PullRequestEntity } from "../services/entities/PullRequestEntity";
import { EntityNotFoundError, ValidationError } from "../shared";

export class PullRequestRepository {
	private readonly table: GithubTable;
	private readonly record: PullRequestRecord;
	private readonly counterRecord: CounterRecord;
	private readonly repoRecord: RepoRecord;

	constructor(
		table: GithubTable,
		record: PullRequestRecord,
		counterRecord: CounterRecord,
		repoRecord: RepoRecord,
	) {
		this.table = table;
		this.record = record;
		this.counterRecord = counterRecord;
		this.repoRecord = repoRecord;
	}

	/**
	 * Create a new pull request with sequential numbering
	 * Uses CounterRepository to get next PR number atomically (shared with Issues)
	 */
	async create(pr: PullRequestEntity): Promise<PullRequestEntity> {
		try {
			// Get next PR number from counter (atomic operation, shared with Issues)
			const prNumber = await this.incrementCounter(pr.owner, pr.repoName);

			// Create PR entity with assigned number
			const prWithNumber = new PullRequestEntity({
				owner: pr.owner,
				repoName: pr.repoName,
				prNumber,
				title: pr.title,
				body: pr.body,
				status: pr.status,
				author: pr.author,
				sourceBranch: pr.sourceBranch,
				targetBranch: pr.targetBranch,
				mergeCommitSha: pr.mergeCommitSha,
			});

			// Build transaction to put PR with duplicate check
			const putPRTransaction = this.record
				.build(PutTransaction)
				.item(prWithNumber.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify repository exists
			const repoCheckTransaction = this.repoRecord
				.build(ConditionCheck)
				.key({
					owner: pr.owner,
					repo_name: pr.repoName,
				})
				.condition({ attr: "PK", exists: true });

			// Execute both in a transaction
			await execute(putPRTransaction, repoCheckTransaction);

			// If successful, fetch the created item
			const created = await this.get(pr.owner, pr.repoName, prNumber);

			if (!created) {
				throw new Error("Failed to retrieve created pull request");
			}

			return created;
		} catch (error: unknown) {
			if (
				error instanceof TransactionCanceledException ||
				error instanceof ConditionalCheckFailedException
			) {
				// Transaction failed - could be duplicate PR or missing repository
				throw new ValidationError(
					"repository",
					`Repository '${pr.owner}/${pr.repoName}' does not exist`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "pull_request", error.message);
			}
			throw error;
		}
	}

	/**
	 * Get a single pull request by owner, repo name, and PR number
	 */
	async get(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<PullRequestEntity | undefined> {
		const result = await this.record
			.build(GetItemCommand)
			.key({
				owner,
				repo_name: repoName,
				pr_number: prNumber,
			})
			.send();

		return result.Item ? PullRequestEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * List all pull requests for a repository
	 * Uses main table query with PK
	 */
	async list(owner: string, repoName: string): Promise<PullRequestEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.record)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				range: { beginsWith: "PR#" },
			})
			.send();

		return (
			result.Items?.map((item) =>
				PullRequestEntity.fromRecord(item as PullRequestFormatted),
			) || []
		);
	}

	/**
	 * List pull requests by status using GSI4
	 * Open PRs: reverse chronological (newest first)
	 * Closed/Merged PRs: chronological (oldest first)
	 */
	async listByStatus(
		owner: string,
		repoName: string,
		status: "open" | "closed" | "merged",
	): Promise<PullRequestEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.record)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				index: "GSI4",
				range: {
					beginsWith:
						status === "open"
							? "PR#OPEN#"
							: status === "closed"
								? "#PR#CLOSED#"
								: "#PR#MERGED#",
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				PullRequestEntity.fromRecord(item as PullRequestFormatted),
			) || []
		);
	}

	/**
	 * Update a pull request
	 * GSI4 keys are automatically recalculated by schema .link() when status changes
	 */
	async update(pr: PullRequestEntity): Promise<PullRequestEntity> {
		try {
			const result = await this.record
				.build(PutItemCommand)
				.item(pr.toRecord())
				.options({
					condition: { attr: "PK", exists: true },
				})
				.send();

			return PullRequestEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new EntityNotFoundError(
					"PullRequestEntity",
					`PR#${pr.owner}#${pr.repoName}#${pr.prNumber}`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "pull_request", error.message);
			}
			throw error;
		}
	}

	/**
	 * Delete a pull request
	 */
	async delete(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<void> {
		await this.record
			.build(DeleteItemCommand)
			.key({
				owner,
				repo_name: repoName,
				pr_number: prNumber,
			})
			.send();
	}

	/**
	 * Atomically increment the counter and return the new value
	 * Private helper method for sequential numbering
	 * Shared with Issues (GitHub convention)
	 */
	private async incrementCounter(
		orgId: string,
		repoId: string,
	): Promise<number> {
		const result = await this.counterRecord
			.build(UpdateItemCommand)
			.item({
				org_id: orgId,
				repo_id: repoId,
				current_value: $add(1),
			})
			.options({ returnValues: "ALL_NEW" })
			.send();

		if (!result.Attributes?.current_value) {
			throw new Error(
				"Failed to increment counter: invalid response from DynamoDB",
			);
		}

		return result.Attributes.current_value;
	}
}
