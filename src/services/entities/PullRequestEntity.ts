import { DateTime } from "luxon";
import type { PullRequestFormatted, PullRequestInput } from "../../repos";
import { ValidationError } from "../../shared";

type PullRequestEntityOpts = {
	owner: string;
	repoName: string;
	prNumber: number;
	title: string;
	body?: string;
	status: "open" | "closed" | "merged";
	author: string;
	sourceBranch: string;
	targetBranch: string;
	mergeCommitSha?: string;
	created?: DateTime;
	modified?: DateTime;
};

type PullRequestCreateRequest = {
	owner: string;
	repo_name: string;
	title: string;
	body?: string;
	status?: "open" | "closed" | "merged";
	author: string;
	source_branch: string;
	target_branch: string;
	merge_commit_sha?: string;
};

type PullRequestUpdateRequest = {
	title?: string;
	body?: string;
	status?: "open" | "closed" | "merged";
	source_branch?: string;
	target_branch?: string;
	merge_commit_sha?: string;
};

type PullRequestResponse = {
	owner: string;
	repo_name: string;
	pr_number: number;
	title: string;
	body?: string;
	status: "open" | "closed" | "merged";
	author: string;
	source_branch: string;
	target_branch: string;
	merge_commit_sha?: string;
	created_at: string;
	updated_at: string;
};

class PullRequestEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly prNumber: number;
	public readonly title: string;
	public readonly body?: string;
	public readonly status: "open" | "closed" | "merged";
	public readonly author: string;
	public readonly sourceBranch: string;
	public readonly targetBranch: string;
	public readonly mergeCommitSha?: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		owner,
		repoName,
		prNumber,
		title,
		body,
		status,
		author,
		sourceBranch,
		targetBranch,
		mergeCommitSha,
		created,
		modified,
	}: PullRequestEntityOpts) {
		this.owner = owner;
		this.repoName = repoName;
		this.prNumber = prNumber;
		this.title = title;
		this.body = body;
		this.status = status;
		this.author = author;
		this.sourceBranch = sourceBranch;
		this.targetBranch = targetBranch;
		this.mergeCommitSha = mergeCommitSha;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(data: PullRequestCreateRequest): PullRequestEntity {
		// Validate before creating entity
		PullRequestEntity.validate(data);

		return new PullRequestEntity({
			owner: data.owner,
			repoName: data.repo_name,
			prNumber: 0, // Will be set by repository after getting next number from counter
			title: data.title,
			body: data.body,
			status: data.status ?? "open",
			author: data.author,
			sourceBranch: data.source_branch,
			targetBranch: data.target_branch,
			mergeCommitSha: data.merge_commit_sha,
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts snake_case to camelCase
	 */
	public static fromRecord(record: PullRequestFormatted): PullRequestEntity {
		return new PullRequestEntity({
			owner: record.owner,
			repoName: record.repo_name,
			prNumber: record.pr_number,
			title: record.title,
			body: record.body,
			status: record.status as "open" | "closed" | "merged",
			author: record.author,
			sourceBranch: record.source_branch,
			targetBranch: record.target_branch,
			mergeCommitSha: record.merge_commit_sha,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts camelCase to snake_case
	 */
	public toRecord(): PullRequestInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			pr_number: this.prNumber,
			title: this.title,
			body: this.body,
			status: this.status,
			author: this.author,
			source_branch: this.sourceBranch,
			target_branch: this.targetBranch,
			merge_commit_sha: this.mergeCommitSha,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): PullRequestResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			pr_number: this.prNumber,
			title: this.title,
			body: this.body,
			status: this.status,
			author: this.author,
			source_branch: this.sourceBranch,
			target_branch: this.targetBranch,
			merge_commit_sha: this.mergeCommitSha,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Update pull request with new data
	 * Returns a new entity with updated fields and new modified timestamp
	 * Validates update data before applying changes
	 */
	public updatePullRequest({
		title,
		body,
		status,
		source_branch,
		target_branch,
		merge_commit_sha,
	}: PullRequestUpdateRequest): PullRequestEntity {
		// Validate title if provided
		if (title !== undefined) {
			if (!title || title.trim().length === 0) {
				throw new ValidationError("title", "Title is required");
			}
			if (title.length > 255) {
				throw new ValidationError(
					"title",
					"Title must be 255 characters or less",
				);
			}
		}

		// Validate status if provided
		if (
			status !== undefined &&
			status !== "open" &&
			status !== "closed" &&
			status !== "merged"
		) {
			throw new ValidationError(
				"status",
				"Status must be 'open', 'closed', or 'merged'",
			);
		}

		// Validate merge_commit_sha only allowed when status is "merged"
		const finalStatus = status ?? this.status;
		const finalMergeCommitSha =
			merge_commit_sha !== undefined ? merge_commit_sha : this.mergeCommitSha;

		if (finalMergeCommitSha && finalStatus !== "merged") {
			throw new ValidationError(
				"merge_commit_sha",
				"Merge commit SHA only allowed when status is 'merged'",
			);
		}

		return new PullRequestEntity({
			owner: this.owner,
			repoName: this.repoName,
			prNumber: this.prNumber,
			author: this.author, // Author never changes
			title: title ?? this.title,
			body: body !== undefined ? body : this.body,
			status: finalStatus,
			sourceBranch: source_branch ?? this.sourceBranch,
			targetBranch: target_branch ?? this.targetBranch,
			mergeCommitSha: finalMergeCommitSha,
			created: this.created, // Preserve original
			modified: DateTime.utc(), // Update to now
		});
	}

	/**
	 * Validate pull request data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<PullRequestCreateRequest> | Partial<PullRequestEntityOpts>,
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

		if (!data.title) {
			throw new ValidationError("title", "Title is required");
		}

		// Validate title length
		if (data.title.length > 255) {
			throw new ValidationError(
				"title",
				"Title must be 255 characters or less",
			);
		}

		if (!data.author) {
			throw new ValidationError("author", "Author is required");
		}

		// Check for branch fields in both naming conventions
		const sourceBranch =
			"sourceBranch" in data
				? data.sourceBranch
				: "source_branch" in data
					? data.source_branch
					: undefined;
		const targetBranch =
			"targetBranch" in data
				? data.targetBranch
				: "target_branch" in data
					? data.target_branch
					: undefined;

		if (!sourceBranch) {
			throw new ValidationError("source_branch", "Source branch is required");
		}

		if (!targetBranch) {
			throw new ValidationError("target_branch", "Target branch is required");
		}

		// Validate merge_commit_sha only allowed when status is "merged"
		const mergeCommitSha =
			"mergeCommitSha" in data
				? data.mergeCommitSha
				: "merge_commit_sha" in data
					? data.merge_commit_sha
					: undefined;

		if (mergeCommitSha && data.status !== "merged") {
			throw new ValidationError(
				"merge_commit_sha",
				"Merge commit SHA only allowed when status is 'merged'",
			);
		}

		// Validate status if provided
		if (
			data.status &&
			data.status !== "open" &&
			data.status !== "closed" &&
			data.status !== "merged"
		) {
			throw new ValidationError(
				"status",
				"Status must be 'open', 'closed', or 'merged'",
			);
		}
	}

	/**
	 * Get the entity key for error messages and logging
	 * Returns a string representation that uniquely identifies this entity
	 */
	public getEntityKey(): string {
		return `PR#${this.owner}#${this.repoName}#${this.prNumber}`;
	}

	/**
	 * Get the parent entity key (Repository) for error messages
	 * Returns a string representation that identifies the parent repository
	 */
	public getParentEntityKey(): string {
		return `REPO#${this.owner}#${this.repoName}`;
	}
}

export { PullRequestEntity };
export type {
	PullRequestEntityOpts,
	PullRequestCreateRequest,
	PullRequestUpdateRequest,
	PullRequestResponse,
};
