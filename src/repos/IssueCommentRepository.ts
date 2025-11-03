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
} from "dynamodb-toolbox";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import type {
	GithubTable,
	IssueCommentRecord,
	IssueRecord,
	IssueCommentFormatted,
} from "./schema";
import { IssueCommentEntity } from "../services/entities/IssueCommentEntity";
import { EntityNotFoundError, ValidationError } from "../shared";

export class IssueCommentRepository {
	private readonly table: GithubTable;
	private readonly commentRecord: IssueCommentRecord;
	private readonly issueRecord: IssueRecord;

	constructor(
		table: GithubTable,
		commentRecord: IssueCommentRecord,
		issueRecord: IssueRecord,
	) {
		this.table = table;
		this.commentRecord = commentRecord;
		this.issueRecord = issueRecord;
	}

	/**
	 * Create a new comment with UUID generation
	 * Validates parent issue exists via transaction
	 */
	async create(comment: IssueCommentEntity): Promise<IssueCommentEntity> {
		try {
			// Ensure comment has UUID (generated in constructor if not provided)
			const commentWithId = new IssueCommentEntity({
				owner: comment.owner,
				repoName: comment.repoName,
				issueNumber: comment.issueNumber,
				commentId: comment.commentId, // Will use existing or generate new
				body: comment.body,
				author: comment.author,
			});

			// Build transaction to put comment with duplicate check
			const putCommentTransaction = this.commentRecord
				.build(PutTransaction)
				.item(commentWithId.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify issue exists
			const issueCheckTransaction = this.issueRecord
				.build(ConditionCheck)
				.key({
					owner: comment.owner,
					repo_name: comment.repoName,
					issue_number: comment.issueNumber,
				})
				.condition({ attr: "PK", exists: true });

			// Execute both in a transaction
			await execute(putCommentTransaction, issueCheckTransaction);

			// If successful, fetch the created item
			const created = await this.get(
				comment.owner,
				comment.repoName,
				comment.issueNumber,
				commentWithId.commentId,
			);

			if (!created) {
				throw new Error("Failed to retrieve created comment");
			}

			return created;
		} catch (error: unknown) {
			if (
				error instanceof TransactionCanceledException ||
				error instanceof ConditionalCheckFailedException
			) {
				// Transaction failed - could be duplicate comment or missing issue
				throw new ValidationError(
					"issue",
					`Issue '${comment.owner}/${comment.repoName}#${comment.issueNumber}' does not exist`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "comment", error.message);
			}
			throw error;
		}
	}

	/**
	 * Get a single comment by composite key
	 */
	async get(
		owner: string,
		repoName: string,
		issueNumber: number,
		commentId: string,
	): Promise<IssueCommentEntity | undefined> {
		const result = await this.commentRecord
			.build(GetItemCommand)
			.key({
				owner,
				repo_name: repoName,
				issue_number: issueNumber,
				comment_id: commentId,
			})
			.send();

		return result.Item ? IssueCommentEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * Update an existing comment
	 */
	async update(comment: IssueCommentEntity): Promise<IssueCommentEntity> {
		try {
			const result = await this.commentRecord
				.build(PutItemCommand)
				.item(comment.toRecord())
				.options({
					condition: { attr: "PK", exists: true },
				})
				.send();

			return IssueCommentEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new EntityNotFoundError(
					"IssueCommentEntity",
					`COMMENT#${comment.owner}#${comment.repoName}#${comment.issueNumber}#${comment.commentId}`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "comment", error.message);
			}
			throw error;
		}
	}

	/**
	 * Delete a comment
	 */
	async delete(
		owner: string,
		repoName: string,
		issueNumber: number,
		commentId: string,
	): Promise<void> {
		await this.commentRecord
			.build(DeleteItemCommand)
			.key({
				owner,
				repo_name: repoName,
				issue_number: issueNumber,
				comment_id: commentId,
			})
			.send();
	}

	/**
	 * List all comments for an issue
	 * Uses PK + SK begins_with pattern
	 */
	async listByIssue(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<IssueCommentEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.commentRecord)
			.query({
				partition: `REPO#${owner}#${repoName}`,
				range: {
					beginsWith: `ISSUE#${String(issueNumber).padStart(6, "0")}#COMMENT#`,
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				IssueCommentEntity.fromRecord(item as IssueCommentFormatted),
			) || []
		);
	}
}
