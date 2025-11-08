import {
	ConditionCheck,
	DeleteItemCommand,
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
import { handleTransactionError } from "./utils";

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
			handleTransactionError(error, {
				entityType: "Reaction",
				entityKey: reaction.getEntityKey(),
				parentEntityType: this.getParentEntityType(reaction.targetType),
				parentEntityKey: reaction.getParentEntityKey(),
				operationName: "reaction",
			});
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
				if (Number.isNaN(issueNumber)) {
					throw new ValidationError(
						"target_id",
						"ISSUE target_id must be a valid number",
					);
				}
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
				if (Number.isNaN(prNumber)) {
					throw new ValidationError(
						"target_id",
						"PR target_id must be a valid number",
					);
				}
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
				if (dashIndex === -1) {
					throw new ValidationError(
						"target_id",
						"ISSUECOMMENT target_id must be in format 'issueNumber-commentId'",
					);
				}
				const issueNumberStr = targetId.substring(0, dashIndex);
				const commentId = targetId.substring(dashIndex + 1);
				const issueNumber = Number.parseInt(issueNumberStr, 10);
				if (Number.isNaN(issueNumber) || !commentId) {
					throw new ValidationError(
						"target_id",
						"Invalid ISSUECOMMENT target_id format",
					);
				}
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
				if (dashIndex === -1) {
					throw new ValidationError(
						"target_id",
						"PRCOMMENT target_id must be in format 'prNumber-commentId'",
					);
				}
				const prNumberStr = targetId.substring(0, dashIndex);
				const commentId = targetId.substring(dashIndex + 1);
				const prNumber = Number.parseInt(prNumberStr, 10);
				if (Number.isNaN(prNumber) || !commentId) {
					throw new ValidationError(
						"target_id",
						"Invalid PRCOMMENT target_id format",
					);
				}
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

	/**
	 * Private helper to get parent entity type name from target type
	 */
	private getParentEntityType(
		targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT",
	): string {
		switch (targetType) {
			case "ISSUE":
				return "IssueEntity";
			case "PR":
				return "PullRequestEntity";
			case "ISSUECOMMENT":
				return "IssueCommentEntity";
			case "PRCOMMENT":
				return "PRCommentEntity";
		}
	}
}
