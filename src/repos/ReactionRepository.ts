import {
	ConditionalCheckFailedException,
	TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
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
	ReactionRecord,
	IssueRecord,
	PullRequestRecord,
	IssueCommentRecord,
	PRCommentRecord,
	ReactionFormatted,
} from "./schema";
import { ReactionEntity } from "../services/entities/ReactionEntity";
import { ValidationError } from "../shared";

export class ReactionRepository {
	private readonly table: GithubTable;
	private readonly reactionRecord: ReactionRecord;
	private readonly issueRecord: IssueRecord;
	private readonly pullRequestRecord: PullRequestRecord;
	private readonly issueCommentRecord: IssueCommentRecord;
	private readonly prCommentRecord: PRCommentRecord;

	constructor(
		table: GithubTable,
		reactionRecord: ReactionRecord,
		issueRecord: IssueRecord,
		pullRequestRecord: PullRequestRecord,
		issueCommentRecord: IssueCommentRecord,
		prCommentRecord: PRCommentRecord,
	) {
		this.table = table;
		this.reactionRecord = reactionRecord;
		this.issueRecord = issueRecord;
		this.pullRequestRecord = pullRequestRecord;
		this.issueCommentRecord = issueCommentRecord;
		this.prCommentRecord = prCommentRecord;
	}

	/**
	 * Create a new reaction with transaction to validate target exists
	 * Uniqueness is enforced via composite key: target + user + emoji
	 */
	async create(reaction: ReactionEntity): Promise<ReactionEntity> {
		try {
			// Build transaction to put reaction with duplicate check
			const putReactionTransaction = this.reactionRecord
				.build(PutTransaction)
				.item(reaction.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify target exists
			const targetCheckTransaction = this.buildTargetCheckTransaction(
				reaction.owner,
				reaction.repoName,
				reaction.targetType,
				reaction.targetId,
			);

			// Execute both in a transaction
			await execute(putReactionTransaction, targetCheckTransaction);

			// If successful, fetch the created item
			const created = await this.get(
				reaction.owner,
				reaction.repoName,
				reaction.targetType,
				reaction.targetId,
				reaction.user,
				reaction.emoji,
			);

			if (!created) {
				throw new Error("Failed to retrieve created reaction");
			}

			return created;
		} catch (error: unknown) {
			if (
				error instanceof TransactionCanceledException ||
				error instanceof ConditionalCheckFailedException
			) {
				// Transaction failed - could be duplicate reaction or missing target
				throw new ValidationError(
					"target",
					`Target '${reaction.targetType}#${reaction.targetId}' does not exist or reaction already exists`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "reaction", error.message);
			}
			throw error;
		}
	}

	/**
	 * Get a single reaction by composite key
	 */
	async get(
		owner: string,
		repoName: string,
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
		targetId: string,
		user: string,
		emoji: string,
	): Promise<ReactionEntity | undefined> {
		const result = await this.reactionRecord
			.build(GetItemCommand)
			.key({
				owner,
				repo_name: repoName,
				target_type: targetType,
				target_id: targetId,
				user,
				emoji,
			})
			.send();

		return result.Item ? ReactionEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * Delete a reaction
	 */
	async delete(
		owner: string,
		repoName: string,
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
		targetId: string,
		user: string,
		emoji: string,
	): Promise<void> {
		await this.reactionRecord
			.build(DeleteItemCommand)
			.key({
				owner,
				repo_name: repoName,
				target_type: targetType,
				target_id: targetId,
				user,
				emoji,
			})
			.send();
	}

	/**
	 * List all reactions for a target
	 * Uses PK + SK begins_with pattern
	 */
	async listByTarget(
		owner: string,
		repoName: string,
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
		targetId: string,
	): Promise<ReactionEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.reactionRecord)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				range: {
					beginsWith: `REACTION#${targetType}#${targetId}#`,
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				ReactionEntity.fromRecord(item as ReactionFormatted),
			) || []
		);
	}

	/**
	 * Get all reactions by a user on a specific target
	 */
	async getByUserAndTarget(
		owner: string,
		repoName: string,
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
		targetId: string,
		user: string,
	): Promise<ReactionEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.reactionRecord)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				range: {
					beginsWith: `REACTION#${targetType}#${targetId}#${user}#`,
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				ReactionEntity.fromRecord(item as ReactionFormatted),
			) || []
		);
	}

	/**
	 * Private helper to build target existence check transaction
	 * Based on target type, checks the appropriate entity
	 */
	private buildTargetCheckTransaction(
		owner: string,
		repoName: string,
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
		targetId: string,
	):
		| ConditionCheck<typeof this.issueRecord>
		| ConditionCheck<typeof this.pullRequestRecord>
		| ConditionCheck<typeof this.issueCommentRecord>
		| ConditionCheck<typeof this.prCommentRecord> {
		switch (targetType) {
			case "ISSUE": {
				// targetId is issue_number
				const issueNumber = Number.parseInt(targetId, 10);
				return this.issueRecord
					.build(ConditionCheck)
					.key({
						owner,
						repo_name: repoName,
						issue_number: issueNumber,
					})
					.condition({ attr: "PK", exists: true });
			}
			case "PR": {
				// targetId is pr_number
				const prNumber = Number.parseInt(targetId, 10);
				return this.pullRequestRecord
					.build(ConditionCheck)
					.key({
						owner,
						repo_name: repoName,
						pr_number: prNumber,
					})
					.condition({ attr: "PK", exists: true });
			}
			case "ISSUECOMMENT": {
				// targetId format: "issueNumber-commentId"
				const dashIndex = targetId.indexOf("-");
				const issueNumberStr = targetId.substring(0, dashIndex);
				const commentId = targetId.substring(dashIndex + 1);
				const issueNumber = Number.parseInt(issueNumberStr, 10);
				return this.issueCommentRecord
					.build(ConditionCheck)
					.key({
						owner,
						repo_name: repoName,
						issue_number: issueNumber,
						comment_id: commentId,
					})
					.condition({ attr: "PK", exists: true });
			}
			case "PRCOMMENT": {
				// targetId format: "prNumber-commentId"
				const dashIndex = targetId.indexOf("-");
				const prNumberStr = targetId.substring(0, dashIndex);
				const commentId = targetId.substring(dashIndex + 1);
				const prNumber = Number.parseInt(prNumberStr, 10);
				return this.prCommentRecord
					.build(ConditionCheck)
					.key({
						owner,
						repo_name: repoName,
						pr_number: prNumber,
						comment_id: commentId,
					})
					.condition({ attr: "PK", exists: true });
			}
		}
	}
}
