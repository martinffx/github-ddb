import { DateTime } from "luxon";
import type { StarFormatted, StarInput } from "../../repos/schema";
import { ValidationError } from "../../shared";

type StarEntityOpts = {
	username: string;
	repoOwner: string;
	repoName: string;
	created?: DateTime;
	modified?: DateTime;
};

type StarCreateRequest = {
	username: string;
	repo_owner: string;
	repo_name: string;
};

type StarResponse = {
	username: string;
	repo_owner: string;
	repo_name: string;
	created_at: string;
	updated_at: string;
};

class StarEntity {
	public readonly username: string;
	public readonly repoOwner: string;
	public readonly repoName: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor(opts: StarEntityOpts) {
		this.username = opts.username;
		this.repoOwner = opts.repoOwner;
		this.repoName = opts.repoName;
		this.created = opts.created ?? DateTime.utc();
		this.modified = opts.modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(data: StarCreateRequest): StarEntity {
		// Validate before creating entity
		StarEntity.validate(data);

		return new StarEntity({
			username: data.username,
			repoOwner: data.repo_owner,
			repoName: data.repo_name,
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts snake_case to camelCase
	 */
	public static fromRecord(record: StarFormatted): StarEntity {
		return new StarEntity({
			username: record.username,
			repoOwner: record.repo_owner,
			repoName: record.repo_name,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts camelCase to snake_case
	 */
	public toRecord(): StarInput {
		return {
			username: this.username,
			repo_owner: this.repoOwner,
			repo_name: this.repoName,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): StarResponse {
		return {
			username: this.username,
			repo_owner: this.repoOwner,
			repo_name: this.repoName,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Validate star data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<StarCreateRequest> | Partial<StarEntityOpts>,
	): void {
		// Validate required fields
		const username = "username" in data ? data.username : undefined;
		if (!username) {
			throw new ValidationError("username", "Username is required");
		}

		const repoOwner = "repoOwner" in data ? data.repoOwner : data.repo_owner;
		if (!repoOwner) {
			throw new ValidationError("repo_owner", "Repository owner is required");
		}

		const repoName = "repoName" in data ? data.repoName : data.repo_name;
		if (!repoName) {
			throw new ValidationError("repo_name", "Repository name is required");
		}

		// Validate username format (alphanumeric, dashes, underscores)
		const usernameRegex = /^[a-zA-Z0-9_-]+$/;
		if (!usernameRegex.test(username)) {
			throw new ValidationError(
				"username",
				"Username must contain only alphanumeric characters, dashes, and underscores",
			);
		}

		// Validate owner format (alphanumeric, dashes, underscores)
		const ownerRegex = /^[a-zA-Z0-9_-]+$/;
		if (!ownerRegex.test(repoOwner)) {
			throw new ValidationError(
				"repo_owner",
				"Repository owner must contain only alphanumeric characters, dashes, and underscores",
			);
		}

		// Validate repo name format (alphanumeric, dashes, underscores, dots)
		const repoRegex = /^[a-zA-Z0-9_.-]+$/;
		if (!repoRegex.test(repoName)) {
			throw new ValidationError(
				"repo_name",
				"Repository name must contain only alphanumeric characters, dashes, underscores, and dots",
			);
		}
	}
}

export { StarEntity };
export type { StarEntityOpts, StarCreateRequest, StarResponse };
