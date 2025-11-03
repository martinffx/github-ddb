import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import type {
	IssueCommentFormatted,
	IssueCommentInput,
} from "../../repos/schema";
import { ValidationError } from "../../shared";

type IssueCommentEntityOpts = {
	owner: string;
	repoName: string;
	issueNumber: number;
	commentId?: string;
	body: string;
	author: string;
	created?: DateTime;
	modified?: DateTime;
};

type IssueCommentCreateRequest = {
	owner: string;
	repo_name: string;
	issue_number: number;
	body: string;
	author: string;
};

type IssueCommentResponse = {
	owner: string;
	repo_name: string;
	issue_number: number;
	comment_id: string;
	body: string;
	author: string;
	created_at: string;
	updated_at: string;
};

class IssueCommentEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly issueNumber: number;
	public readonly commentId: string;
	public readonly body: string;
	public readonly author: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor(opts: IssueCommentEntityOpts) {
		this.owner = opts.owner;
		this.repoName = opts.repoName;
		this.issueNumber = opts.issueNumber;
		this.commentId = opts.commentId ?? randomUUID();
		this.body = opts.body;
		this.author = opts.author;
		this.created = opts.created ?? DateTime.utc();
		this.modified = opts.modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(
		data: IssueCommentCreateRequest,
	): IssueCommentEntity {
		// Validate before creating entity
		IssueCommentEntity.validate(data);

		return new IssueCommentEntity({
			owner: data.owner,
			repoName: data.repo_name,
			issueNumber: data.issue_number,
			body: data.body,
			author: data.author,
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts snake_case to camelCase
	 */
	public static fromRecord(record: IssueCommentFormatted): IssueCommentEntity {
		return new IssueCommentEntity({
			owner: record.owner,
			repoName: record.repo_name,
			issueNumber: record.issue_number,
			commentId: record.comment_id,
			body: record.body,
			author: record.author,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts camelCase to snake_case
	 */
	public toRecord(): IssueCommentInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			issue_number: this.issueNumber,
			comment_id: this.commentId,
			body: this.body,
			author: this.author,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): IssueCommentResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			issue_number: this.issueNumber,
			comment_id: this.commentId,
			body: this.body,
			author: this.author,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Validate comment data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<IssueCommentCreateRequest> | Partial<IssueCommentEntityOpts>,
	): void {
		// Validate required fields
		if (!data.owner) {
			throw new ValidationError("owner", "Owner is required");
		}

		if ("repoName" in data) {
			if (!data.repoName) {
				throw new ValidationError("repo_name", "Repository name is required");
			}
		} else if (!("repo_name" in data) || !data.repo_name) {
			throw new ValidationError("repo_name", "Repository name is required");
		}

		if (
			"issueNumber" in data &&
			(data.issueNumber === undefined || data.issueNumber === null)
		) {
			throw new ValidationError("issue_number", "Issue number is required");
		} else if (
			!("issueNumber" in data) &&
			(!("issue_number" in data) ||
				data.issue_number === undefined ||
				data.issue_number === null)
		) {
			throw new ValidationError("issue_number", "Issue number is required");
		}

		if (!data.body) {
			throw new ValidationError("body", "Comment body is required");
		}

		// Validate body is not empty
		if (data.body.trim().length === 0) {
			throw new ValidationError("body", "Comment body cannot be empty");
		}

		if (!data.author) {
			throw new ValidationError("author", "Author is required");
		}
	}
}

export { IssueCommentEntity };
export type {
	IssueCommentEntityOpts,
	IssueCommentCreateRequest,
	IssueCommentResponse,
};
