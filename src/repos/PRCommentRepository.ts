import {
	ConditionCheck,
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
} from "dynamodb-toolbox";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import type {
	GithubTable,
	PRCommentRecord,
	PullRequestRecord,
	PRCommentFormatted,
} from "./schema";
import { PRCommentEntity } from "../services/entities/PRCommentEntity";
import { handleTransactionError, handleUpdateError } from "./utils";

export class PRCommentRepository {
	private readonly table: GithubTable;
	private readonly commentRecord: PRCommentRecord;
	private readonly prRecord: PullRequestRecord;

	constructor(
		table: GithubTable,
		commentRecord: PRCommentRecord,
		prRecord: PullRequestRecord,
	) {
		this.table = table;
		this.commentRecord = commentRecord;
		this.prRecord = prRecord;
	}

	/**
	 * Create a new PR comment
	 * Validates that the parent PR exists
	 */
	async create(comment: PRCommentEntity): Promise<PRCommentEntity> {
		try {
			// Generate UUID if not provided
			const commentWithId = new PRCommentEntity({
				owner: comment.owner,
				repoName: comment.repoName,
				prNumber: comment.prNumber,
				commentId: comment.commentId,
				body: comment.body,
				author: comment.author,
			});

			// Build transaction to put comment with duplicate check
			const putCommentTransaction = this.commentRecord
				.build(PutTransaction)
				.item(commentWithId.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify PR exists
			const prCheckTransaction = this.prRecord
				.build(ConditionCheck)
				.key({
					owner: comment.owner,
					repo_name: comment.repoName,
					pr_number: comment.prNumber,
				})
				.condition({ attr: "PK", exists: true });

			// Execute both in a transaction
			await execute(putCommentTransaction, prCheckTransaction);

			// Fetch created item
			const created = await this.get(
				comment.owner,
				comment.repoName,
				comment.prNumber,
				commentWithId.commentId,
			);

			if (!created) {
				throw new Error("Failed to retrieve created comment");
			}

			return created;
		} catch (error: unknown) {
			handleTransactionError(error, {
				entityType: "PRComment",
				entityKey: comment.getEntityKey(),
				parentEntityType: "PullRequestEntity",
				parentEntityKey: comment.getParentEntityKey(),
				operationName: "comment",
			});
		}
	}

	/**
	 * Get a single PR comment by owner, repo name, PR number, and comment ID
	 */
	async get(
		owner: string,
		repoName: string,
		prNumber: number,
		commentId: string,
	): Promise<PRCommentEntity | undefined> {
		const result = await this.commentRecord
			.build(GetItemCommand)
			.key({
				owner,
				repo_name: repoName,
				pr_number: prNumber,
				comment_id: commentId,
			})
			.send();

		return result.Item ? PRCommentEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * List all comments for a PR
	 * Uses item collection pattern with PK + SK begins_with
	 */
	async listByPR(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<PRCommentEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.commentRecord)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				range: {
					beginsWith: `PR#${String(prNumber).padStart(8, "0")}#COMMENT#`,
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				PRCommentEntity.fromRecord(item as PRCommentFormatted),
			) || []
		);
	}

	/**
	 * Update a PR comment
	 */
	async update(comment: PRCommentEntity): Promise<PRCommentEntity> {
		try {
			const result = await this.commentRecord
				.build(PutItemCommand)
				.item(comment.toRecord())
				.options({
					condition: { attr: "PK", exists: true },
				})
				.send();

			return PRCommentEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			handleUpdateError(error, "PRComment", comment.getEntityKey());
		}
	}

	/**
	 * Delete a PR comment
	 */
	async delete(
		owner: string,
		repoName: string,
		prNumber: number,
		commentId: string,
	): Promise<void> {
		await this.commentRecord
			.build(DeleteItemCommand)
			.key({
				owner,
				repo_name: repoName,
				pr_number: prNumber,
				comment_id: commentId,
			})
			.send();
	}
}
