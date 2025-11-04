import { DateTime } from "luxon";
import type { IssueFormatted, IssueInput } from "../../repos";
import { ValidationError } from "../../shared";

type IssueEntityOpts = {
	owner: string;
	repoName: string;
	issueNumber: number;
	title: string;
	body?: string;
	status: "open" | "closed";
	author: string;
	assignees: string[];
	labels: string[];
	created?: DateTime;
	modified?: DateTime;
};

type IssueCreateRequest = {
	owner: string;
	repo_name: string;
	title: string;
	body?: string;
	status?: "open" | "closed";
	author: string;
	assignees?: string[];
	labels?: string[];
};

type IssueUpdateRequest = {
	title?: string;
	body?: string;
	status?: "open" | "closed";
	assignees?: string[];
	labels?: string[];
};

type UpdateIssueEntityOpts = {
	title?: string;
	body?: string;
	status?: "open" | "closed";
	assignees?: string[];
	labels?: string[];
};

type IssueResponse = {
	owner: string;
	repo_name: string;
	issue_number: number;
	title: string;
	body?: string;
	status: "open" | "closed";
	author: string;
	assignees: string[];
	labels: string[];
	created_at: string;
	updated_at: string;
};

class IssueEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly issueNumber: number;
	public readonly title: string;
	public readonly body?: string;
	public readonly status: "open" | "closed";
	public readonly author: string;
	public readonly assignees: string[];
	public readonly labels: string[];
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		owner,
		repoName,
		issueNumber,
		title,
		body,
		status,
		author,
		assignees,
		labels,
		created,
		modified,
	}: IssueEntityOpts) {
		this.owner = owner;
		this.repoName = repoName;
		this.issueNumber = issueNumber;
		this.title = title;
		this.body = body;
		this.status = status;
		this.author = author;
		this.assignees = assignees;
		this.labels = labels;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(data: IssueCreateRequest): IssueEntity {
		// Validate before creating entity
		IssueEntity.validate(data);

		return new IssueEntity({
			owner: data.owner,
			repoName: data.repo_name,
			issueNumber: 0, // Will be set by repository after getting next number from counter
			title: data.title,
			body: data.body,
			status: data.status ?? "open",
			author: data.author,
			assignees: data.assignees ?? [],
			labels: data.labels ?? [],
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts Sets to Arrays and snake_case to camelCase
	 */
	public static fromRecord(record: IssueFormatted): IssueEntity {
		return new IssueEntity({
			owner: record.owner,
			repoName: record.repo_name,
			issueNumber: record.issue_number,
			title: record.title,
			body: record.body,
			status: record.status as "open" | "closed",
			author: record.author,
			// Convert DynamoDB Sets to Arrays, handle undefined
			assignees: record.assignees ? Array.from(record.assignees) : [],
			labels: record.labels ? Array.from(record.labels) : [],
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts Arrays to Sets (only if not empty, as DynamoDB doesn't allow empty Sets)
	 */
	public toRecord(): IssueInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			issue_number: this.issueNumber,
			title: this.title,
			body: this.body,
			status: this.status,
			author: this.author,
			// Only include Sets if arrays are not empty (DynamoDB doesn't allow empty Sets)
			assignees:
				this.assignees && this.assignees.length > 0
					? new Set(this.assignees)
					: undefined,
			labels:
				this.labels && this.labels.length > 0
					? new Set(this.labels)
					: undefined,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): IssueResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			issue_number: this.issueNumber,
			title: this.title,
			body: this.body,
			status: this.status,
			author: this.author,
			assignees: this.assignees,
			labels: this.labels,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Update issue with new data
	 * Returns new entity with updated fields and new modified timestamp
	 */
	public updateIssue({
		title,
		body,
		status,
		assignees,
		labels,
	}: UpdateIssueEntityOpts): IssueEntity {
		// Validate title if provided
		if (title !== undefined) {
			if (!title) {
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
		if (status !== undefined && status !== "open" && status !== "closed") {
			throw new ValidationError("status", "Status must be 'open' or 'closed'");
		}

		return new IssueEntity({
			owner: this.owner,
			repoName: this.repoName,
			issueNumber: this.issueNumber,
			author: this.author, // Author never changes
			title: title ?? this.title,
			body: body !== undefined ? body : this.body,
			status: status ?? this.status,
			assignees: assignees ?? this.assignees,
			labels: labels ?? this.labels,
			created: this.created, // Preserve original
			modified: DateTime.utc(), // Update to now
		});
	}

	/**
	 * Validate issue data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<IssueCreateRequest> | Partial<IssueEntityOpts>,
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

		// Validate status if provided
		if (data.status && data.status !== "open" && data.status !== "closed") {
			throw new ValidationError("status", "Status must be 'open' or 'closed'");
		}
	}
}

export { IssueEntity };
export type {
	IssueEntityOpts,
	IssueCreateRequest,
	IssueUpdateRequest,
	IssueResponse,
};
