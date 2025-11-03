import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { PRCommentFormatted, PRCommentInput } from "../../repos";
import { ValidationError } from "../../shared";

type PRCommentEntityOpts = {
	owner: string;
	repoName: string;
	prNumber: number;
	commentId?: string;
	body: string;
	author: string;
	created?: DateTime;
	modified?: DateTime;
};

type PRCommentCreateRequest = {
	owner: string;
	repo_name: string;
	pr_number: number;
	body: string;
	author: string;
};

type PRCommentUpdateRequest = {
	body?: string;
};

type PRCommentResponse = {
	owner: string;
	repo_name: string;
	pr_number: number;
	comment_id: string;
	body: string;
	author: string;
	created_at: string;
	updated_at: string;
};

class PRCommentEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly prNumber: number;
	public readonly commentId: string;
	public readonly body: string;
	public readonly author: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor(opts: PRCommentEntityOpts) {
		this.owner = opts.owner;
		this.repoName = opts.repoName;
		this.prNumber = opts.prNumber;
		this.commentId = opts.commentId ?? randomUUID();
		this.body = opts.body;
		this.author = opts.author;
		this.created = opts.created ?? DateTime.utc();
		this.modified = opts.modified ?? DateTime.utc();
	}

	public static fromRequest(request: PRCommentCreateRequest): PRCommentEntity {
		PRCommentEntity.validate(request);
		return new PRCommentEntity({
			owner: request.owner,
			repoName: request.repo_name,
			prNumber: request.pr_number,
			body: request.body,
			author: request.author,
		});
	}

	public static fromRecord(record: PRCommentFormatted): PRCommentEntity {
		return new PRCommentEntity({
			owner: record.owner,
			repoName: record.repo_name,
			prNumber: record.pr_number,
			commentId: record.comment_id,
			body: record.body,
			author: record.author,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	public toRecord(): PRCommentInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			pr_number: this.prNumber,
			comment_id: this.commentId,
			body: this.body,
			author: this.author,
		};
	}

	public toResponse(): PRCommentResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			pr_number: this.prNumber,
			comment_id: this.commentId,
			body: this.body,
			author: this.author,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Validate PR comment data
	 */
	public static validate(
		data: Partial<PRCommentCreateRequest | PRCommentEntityOpts>,
	): void {
		// Owner validation
		if (data.owner !== undefined) {
			if (typeof data.owner !== "string" || data.owner.length === 0) {
				throw new ValidationError("owner", "Owner must be a non-empty string");
			}
			if (!/^[a-zA-Z0-9_-]+$/.test(data.owner)) {
				throw new ValidationError(
					"owner",
					"Owner must contain only alphanumeric characters, hyphens, and underscores",
				);
			}
		}

		// Repo name validation
		const repoName =
			"repoName" in data
				? data.repoName
				: "repo_name" in data
					? data.repo_name
					: undefined;
		if (repoName !== undefined) {
			if (typeof repoName !== "string" || repoName.length === 0) {
				throw new ValidationError(
					"repo_name",
					"Repository name must be a non-empty string",
				);
			}
			if (!/^[a-zA-Z0-9_.-]+$/.test(repoName)) {
				throw new ValidationError(
					"repo_name",
					"Repository name must contain only alphanumeric characters, hyphens, underscores, and periods",
				);
			}
		}

		// PR number validation
		const prNumber =
			"prNumber" in data
				? data.prNumber
				: "pr_number" in data
					? data.pr_number
					: undefined;
		if (prNumber !== undefined) {
			if (typeof prNumber !== "number" || prNumber <= 0) {
				throw new ValidationError(
					"pr_number",
					"PR number must be a positive integer",
				);
			}
		}

		// Body validation
		if (data.body !== undefined) {
			if (typeof data.body !== "string" || data.body.length === 0) {
				throw new ValidationError(
					"body",
					"Comment body must be a non-empty string",
				);
			}
		}

		// Author validation
		if (data.author !== undefined) {
			if (typeof data.author !== "string" || data.author.length === 0) {
				throw new ValidationError(
					"author",
					"Author must be a non-empty string",
				);
			}
			if (!/^[a-zA-Z0-9_-]+$/.test(data.author)) {
				throw new ValidationError(
					"author",
					"Author must contain only alphanumeric characters, hyphens, and underscores",
				);
			}
		}
	}

	/**
	 * Create a new entity with updated fields
	 */
	public updateWith(update: PRCommentUpdateRequest): PRCommentEntity {
		return new PRCommentEntity({
			owner: this.owner,
			repoName: this.repoName,
			prNumber: this.prNumber,
			commentId: this.commentId,
			body: update.body ?? this.body,
			author: this.author,
			created: this.created,
			modified: DateTime.utc(),
		});
	}
}

export {
	PRCommentEntity,
	type PRCommentEntityOpts,
	type PRCommentCreateRequest,
	type PRCommentUpdateRequest,
	type PRCommentResponse,
};
