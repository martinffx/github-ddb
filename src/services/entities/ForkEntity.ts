import { DateTime } from "luxon";
import type { ForkFormatted, ForkInput } from "../../repos/schema";
import { ValidationError } from "../../shared";

type ForkEntityOpts = {
	originalOwner: string;
	originalRepo: string;
	forkOwner: string;
	forkRepo: string;
	created?: DateTime;
	modified?: DateTime;
};

type ForkCreateRequest = {
	original_owner: string;
	original_repo: string;
	fork_owner: string;
	fork_repo: string;
};

type ForkResponse = {
	original_owner: string;
	original_repo: string;
	fork_owner: string;
	fork_repo: string;
	created_at: string;
	updated_at: string;
};

class ForkEntity {
	public readonly originalOwner: string;
	public readonly originalRepo: string;
	public readonly forkOwner: string;
	public readonly forkRepo: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor(opts: ForkEntityOpts) {
		this.originalOwner = opts.originalOwner;
		this.originalRepo = opts.originalRepo;
		this.forkOwner = opts.forkOwner;
		this.forkRepo = opts.forkRepo;
		this.created = opts.created ?? DateTime.utc();
		this.modified = opts.modified ?? DateTime.utc();
	}

	/**
	 * Transform API request to entity
	 * Validates input and sets defaults
	 */
	public static fromRequest(data: ForkCreateRequest): ForkEntity {
		// Validate before creating entity
		ForkEntity.validate(data);

		return new ForkEntity({
			originalOwner: data.original_owner,
			originalRepo: data.original_repo,
			forkOwner: data.fork_owner,
			forkRepo: data.fork_repo,
		});
	}

	/**
	 * Transform DynamoDB record to entity
	 * Converts snake_case to camelCase
	 */
	public static fromRecord(record: ForkFormatted): ForkEntity {
		return new ForkEntity({
			originalOwner: record.original_owner,
			originalRepo: record.original_repo,
			forkOwner: record.fork_owner,
			forkRepo: record.fork_repo,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	/**
	 * Transform entity to DynamoDB record
	 * Converts camelCase to snake_case
	 */
	public toRecord(): ForkInput {
		return {
			original_owner: this.originalOwner,
			original_repo: this.originalRepo,
			fork_owner: this.forkOwner,
			fork_repo: this.forkRepo,
		};
	}

	/**
	 * Transform entity to API response
	 * Returns clean object for JSON serialization
	 */
	public toResponse(): ForkResponse {
		return {
			original_owner: this.originalOwner,
			original_repo: this.originalRepo,
			fork_owner: this.forkOwner,
			fork_repo: this.forkRepo,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Validate fork data
	 * Throws ValidationError with clear messages
	 */
	public static validate(
		data: Partial<ForkCreateRequest> | Partial<ForkEntityOpts>,
	): void {
		// Validate required fields
		const originalOwner =
			"originalOwner" in data
				? data.originalOwner
				: "original_owner" in data
					? data.original_owner
					: undefined;
		if (!originalOwner) {
			throw new ValidationError("original_owner", "Original owner is required");
		}

		const originalRepo =
			"originalRepo" in data
				? data.originalRepo
				: "original_repo" in data
					? data.original_repo
					: undefined;
		if (!originalRepo) {
			throw new ValidationError(
				"original_repo",
				"Original repository name is required",
			);
		}

		const forkOwner =
			"forkOwner" in data
				? data.forkOwner
				: "fork_owner" in data
					? data.fork_owner
					: undefined;
		if (!forkOwner) {
			throw new ValidationError("fork_owner", "Fork owner is required");
		}

		const forkRepo =
			"forkRepo" in data
				? data.forkRepo
				: "fork_repo" in data
					? data.fork_repo
					: undefined;
		if (!forkRepo) {
			throw new ValidationError(
				"fork_repo",
				"Fork repository name is required",
			);
		}

		// Validate owner/repo name format (alphanumeric, dashes, underscores, dots)
		const ownerRegex = /^[a-zA-Z0-9_-]+$/;
		const repoRegex = /^[a-zA-Z0-9_.-]+$/;

		if (!ownerRegex.test(originalOwner)) {
			throw new ValidationError(
				"original_owner",
				"Original owner must contain only alphanumeric characters, dashes, and underscores",
			);
		}

		if (!repoRegex.test(originalRepo)) {
			throw new ValidationError(
				"original_repo",
				"Original repository name must contain only alphanumeric characters, dashes, underscores, and dots",
			);
		}

		if (!ownerRegex.test(forkOwner)) {
			throw new ValidationError(
				"fork_owner",
				"Fork owner must contain only alphanumeric characters, dashes, and underscores",
			);
		}

		if (!repoRegex.test(forkRepo)) {
			throw new ValidationError(
				"fork_repo",
				"Fork repository name must contain only alphanumeric characters, dashes, underscores, and dots",
			);
		}

		// Ensure source and target are different
		if (originalOwner === forkOwner && originalRepo === forkRepo) {
			throw new ValidationError(
				"fork",
				"Fork cannot have the same owner and repository name as the original",
			);
		}
	}
}

export { ForkEntity };
export type { ForkEntityOpts, ForkCreateRequest, ForkResponse };
