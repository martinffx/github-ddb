import { DateTime } from "luxon";
import type { RepoFormatted, RepoInput } from "../../repos";
import type {
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
	RepositoryResponse,
} from "../../routes/schema";

type RepositoryEntityOpts = {
	owner: string;
	repoName: string;
	description?: string;
	isPrivate?: boolean;
	language?: string;
	created?: DateTime;
	modified?: DateTime;
};

type RepositoryId = {
	owner: string;
	repo_name: string;
};

class RepositoryEntity {
	public readonly owner: string;
	public readonly repoName: string;
	public readonly description?: string;
	public readonly isPrivate: boolean;
	public readonly language?: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		owner,
		repoName,
		description,
		isPrivate,
		language,
		created,
		modified,
	}: RepositoryEntityOpts) {
		this.owner = owner;
		this.repoName = repoName;
		this.description = description;
		this.isPrivate = isPrivate ?? false;
		this.language = language;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	public static fromRequest(
		request: RepositoryCreateRequest,
	): RepositoryEntity {
		return new RepositoryEntity({
			owner: request.owner,
			repoName: request.repo_name,
			description: request.description,
			isPrivate: request.is_private ?? false,
			language: request.language,
		});
	}

	public static fromRecord(record: RepoFormatted): RepositoryEntity {
		return new RepositoryEntity({
			owner: record.owner,
			repoName: record.repo_name,
			description: record.description,
			isPrivate: record.is_private,
			language: record.language,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	public getRepoId(): RepositoryId {
		return {
			repo_name: this.repoName,
			owner: this.owner,
		};
	}

	public toRecord(): RepoInput {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			description: this.description,
			is_private: this.isPrivate,
			language: this.language,
		};
	}

	public toResponse(): RepositoryResponse {
		return {
			owner: this.owner,
			repo_name: this.repoName,
			description: this.description,
			is_private: this.isPrivate,
			language: this.language,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	/**
	 * Create a new entity with updated fields
	 */
	public updateWith(update: RepositoryUpdateRequest): RepositoryEntity {
		return new RepositoryEntity({
			owner: this.owner,
			repoName: this.repoName,
			description: update.description ?? this.description,
			isPrivate: update.is_private ?? this.isPrivate,
			language: update.language ?? this.language,
			created: this.created,
			modified: DateTime.utc(),
		});
	}

	/**
	 * Get the entity key for error messages and logging
	 * Returns a string representation that uniquely identifies this entity
	 */
	public getEntityKey(): string {
		return `REPO#${this.owner}#${this.repoName}`;
	}

	/**
	 * Get the parent entity key (the owner: User or Organization)
	 * Returns a string representation of the parent entity for error messages
	 */
	public getParentEntityKey(): string {
		return `ACCOUNT#${this.owner}`;
	}
}

export { RepositoryEntity, type RepositoryId };
