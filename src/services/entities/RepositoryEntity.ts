import { DateTime } from "luxon";
import type { RepoFormatted, RepoInput } from "../../repos";
import type {
  RepositoryCreateRequest,
  RepositoryUpdateRequest,
  RepositoryResponse,
} from "../../shared";
import {
  validateUsername,
  validateRepoName,
  ValidationError,
} from "../../shared";

type RepositoryEntityOpts = {
  owner: string;
  repo_name: string;
  description?: string;
  is_private?: boolean;
  language?: string;
  created?: DateTime;
  modified?: DateTime;
};

class RepositoryEntity {
  public readonly owner: string;
  public readonly repo_name: string;
  public readonly description?: string;
  public readonly is_private: boolean;
  public readonly language?: string;
  public readonly created: DateTime;
  public readonly modified: DateTime;

  constructor({
    owner,
    repo_name,
    description,
    is_private,
    language,
    created,
    modified,
  }: RepositoryEntityOpts) {
    this.owner = owner;
    this.repo_name = repo_name;
    this.description = description;
    this.is_private = is_private ?? false;
    this.language = language;
    this.created = created ?? DateTime.utc();
    this.modified = modified ?? DateTime.utc();
  }

  public static fromRequest(
    request: RepositoryCreateRequest,
  ): RepositoryEntity {
    const entity = new RepositoryEntity({
      owner: request.owner,
      repo_name: request.repo_name,
      description: request.description,
      is_private: request.is_private ?? false,
      language: request.language,
    });

    entity.validate();
    return entity;
  }

  public static fromRecord(record: RepoFormatted): RepositoryEntity {
    return new RepositoryEntity({
      owner: record.owner,
      repo_name: record.repo_name,
      description: record.description,
      is_private: record.is_private,
      language: record.language,
      c: record.created_at,
      updated_at: record.updated_at,
    });
  }

  public toRecord(): RepositoryInput {
    return {
      owner: this.owner,
      repo_name: this.repo_name,
      description: this.description,
      is_private: this.is_private,
      language: this.language,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  public toResponse(): RepositoryResponse {
    return {
      owner: this.owner,
      repo_name: this.repo_name,
      description: this.description,
      is_private: this.is_private,
      language: this.language,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  public validate(): void {
    validateUsername(this.owner);
    validateRepoName(this.repo_name);
  }

  /**
   * Validate that the repository owner exists as either a user or organization
   */
  public async validateOwnerExists(
    userRepo: { get(username: string): Promise<any> },
    orgRepo: { get(orgName: string): Promise<any> },
  ): Promise<void> {
    const [userExists, orgExists] = await Promise.all([
      userRepo.get(this.owner),
      orgRepo.get(this.owner),
    ]);

    if (!userExists && !orgExists) {
      throw new ValidationError(
        "owner",
        `Repository owner '${this.owner}' does not exist as user or organization`,
      );
    }
  }

  /**
   * Create a new entity with updated fields
   */
  public updateWith(update: RepositoryUpdateRequest): RepositoryEntity {
    return new RepositoryEntity({
      owner: this.owner,
      repo_name: this.repo_name,
      description: update.description ?? this.description,
      is_private: update.is_private ?? this.is_private,
      language: update.language ?? this.language,
      created_at: this.created_at,
      updated_at: new Date().toISOString(),
    });
  }
}

export { RepositoryEntity };
