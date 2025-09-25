import { GetItemCommand, PutItemCommand } from "dynamodb-toolbox";
import { RepositoryEntity } from "../services";
import type { RepositoryRecord, GithubTable, RepoRecord } from "./schema";
import type { PaginatedResponse } from "../shared";
import {
  ValidationError,
  DuplicateEntityError,
  EntityNotFoundError,
} from "../shared";

type RepositoryId = {
  owner: string;
  repo_name: string;
};

type ListOptions = {
  limit?: number;
  cursor?: string;
};

export class RepoRepository {
  private readonly table: GithubTable;
  private readonly record: RepoRecord;

  constructor(table: GithubTable, record: RepositoryRecord) {
    this.table = table;
    this.record = record;
  }

  async create(entity: RepositoryEntity): Promise<RepositoryEntity> {
    try {
      const result = await this.record
        .build(PutItemCommand)
        .item(entity.toRecord())
        .conditions({
          and: [
            {attr: }
          ]
        })
        .send();

      return RepositoryEntity.fromRecord(result.Attributes);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new DuplicateEntityError(
          "Repository",
          ["owner", "repo_name"],
          [repository.owner, repository.repo_name],
        );
      }
      throw error;
    }
  }

  async get(id: RepositoryId): Promise<RepositoryEntity | null> {
    const result = await this.repositoryRecord
      .build(GetItemCommand)
      .key({
        owner: id.owner,
        repo_name: id.repo_name,
      })
      .send();

    return result.Item ? RepositoryEntity.fromRecord(result.Item) : null;
  }

  async update(repository: RepositoryEntity): Promise<RepositoryEntity> {
    // Validate entity first
    repository.validate();

    // Check if repository exists
    const existing = await this.get({
      owner: repository.owner,
      repo_name: repository.repo_name,
    });

    if (!existing) {
      throw new EntityNotFoundError(
        "Repository",
        ["owner", "repo_name"],
        [repository.owner, repository.repo_name],
      );
    }

    const repositoryInput = repository.toRecord();
    const result = await this.repositoryRecord
      .build()
      .put(repositoryInput)
      .condition("attribute_exists(PK)")
      .send();

    return RepositoryEntity.fromRecord(result.Attributes);
  }

  async delete(id: RepositoryId): Promise<void> {
    // Check if repository exists
    const existing = await this.get(id);

    if (!existing) {
      throw new EntityNotFoundError(
        "Repository",
        ["owner", "repo_name"],
        [id.owner, id.repo_name],
      );
    }

    await this.repositoryRecord
      .build()
      .delete({
        owner: id.owner,
        repo_name: id.repo_name,
      })
      .send();
  }

  async listByOwner(
    owner: string,
    options: ListOptions = {},
  ): Promise<PaginatedResponse<RepositoryEntity>> {
    const { limit = 50, cursor } = options;

    const queryCommand = this.repositoryRecord
      .build()
      .query()
      .index("GSI3")
      .key({
        GSI3PK: `ACCOUNT#${owner}`,
      })
      .limit(limit)
      .scanIndexForward(false); // Most recent first

    if (cursor) {
      queryCommand.startFrom(JSON.parse(cursor));
    }

    const result = await queryCommand.send();

    const items =
      result.Items?.map((item) => RepositoryEntity.fromRecord(item)) || [];

    return {
      items,
      has_more: !!result.LastEvaluatedKey,
      next_cursor: result.LastEvaluatedKey
        ? JSON.stringify(result.LastEvaluatedKey)
        : undefined,
    };
  }

  async getByOwnerAndName(
    owner: string,
    repoName: string,
  ): Promise<RepositoryEntity | null> {
    return this.get({ owner, repo_name: repoName });
  }
}
