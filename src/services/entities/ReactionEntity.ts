import { DateTime } from "luxon";
import type { ReactionFormatted, ReactionInput } from "../../repos/schema";
import { ValidationError } from "../../shared";

type ReactionEntityOpts = {
	owner: string;
	repoName: string;
	targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT";
	targetId: string;
	user: string;
	emoji: string;
	created?: DateTime;
	modified?: DateTime;
};

type ReactionCreateRequest = {
	owner: string;
	repo_name: string;
	target_type: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT";
	target_id: string;
	user: string;
	emoji: string;
};

type ReactionResponse = {
	owner: string;
	repo_name: string;
	target_type: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT";
	target_id: string;
	user: string;
	emoji: string;
	created_at: string;
	updated_at: string;
};

class ReactionEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly targetType: "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT";
	public readonly targetId: string;
	public readonly user: string;
	public readonly emoji: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor(opts: ReactionEntityOpts) {
		this.owner = opts.owner;
		this.repoName = opts.repoName;
		this.targetType = opts.targetType;
		this.targetId = opts.targetId;
		this.user = opts.user;
		this.emoji = opts.emoji;
		this.created = opts.created ?? DateTime.utc();
		this.modified = opts.modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(data: ReactionCreateRequest): ReactionEntity {
		// Validate before creating entity
		ReactionEntity.validate(data);

		return new ReactionEntity({
			owner: data.owner,
			repoName: data.repo_name,
			targetType: data.target_type,
			targetId: data.target_id,
			user: data.user,
			emoji: data.emoji,
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts snake_case to camelCase
	 */
	public static fromRecord(record: ReactionFormatted): ReactionEntity {
		return new ReactionEntity({
			owner: record.owner,
			repoName: record.repo_name,
			targetType: record.target_type as
				| "ISSUE"
				| "PR"
				| "ISSUECOMMENT"
				| "PRCOMMENT",
			targetId: record.target_id,
			user: record.user,
			emoji: record.emoji,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts camelCase to snake_case
	 */
	public toRecord(): ReactionInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			target_type: this.targetType,
			target_id: this.targetId,
			user: this.user,
			emoji: this.emoji,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): ReactionResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			target_type: this.targetType,
			target_id: this.targetId,
			user: this.user,
			emoji: this.emoji,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Validate reaction data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<ReactionCreateRequest> | Partial<ReactionEntityOpts>,
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

		// Validate target_type
		const targetType =
			"targetType" in data ? data.targetType : data.target_type;
		if (!targetType) {
			throw new ValidationError("target_type", "Target type is required");
		}

		const validTypes = ["ISSUE", "PR", "ISSUECOMMENT", "PRCOMMENT"];
		if (!validTypes.includes(targetType)) {
			throw new ValidationError(
				"target_type",
				`Target type must be one of: ${validTypes.join(", ")}`,
			);
		}

		// Validate target_id
		const targetId = "targetId" in data ? data.targetId : data.target_id;
		if (!targetId) {
			throw new ValidationError("target_id", "Target ID is required");
		}

		// Validate user
		if (!data.user) {
			throw new ValidationError("user", "User is required");
		}

		// Validate emoji
		if (!data.emoji) {
			throw new ValidationError("emoji", "Emoji is required");
		}

		// Validate emoji format (must be valid unicode emoji)
		// Include Emoji_Component to support variation selectors (U+FE0F) and other emoji modifiers
		if (!/^[\p{Emoji}\p{Emoji_Component}]+$/u.test(data.emoji)) {
			throw new ValidationError("emoji", "Emoji must be a valid unicode emoji");
		}
	}
}

export { ReactionEntity };
export type { ReactionEntityOpts, ReactionCreateRequest, ReactionResponse };
