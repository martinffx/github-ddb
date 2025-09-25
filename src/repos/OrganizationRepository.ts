import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import type { OrganizationRecord, GithubTable } from "./schema";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "dynamodb-toolbox";

type OrganizationPage = {
  offset?: string;
  items: OrganizationEntity[];
};

export class OrganizationRepository {
  private readonly table: GithubTable;
  private readonly record: OrganizationRecord;

  constructor(table: GithubTable, record: OrganizationRecord) {
    this.table = table;
    this.record = record;
  }

  async createOrg(entity: OrganizationEntity): Promise<OrganizationEntity> {
    try {
      const result = await this.record
        .build(PutItemCommand)
        .item(entity.toRecord())
        .options({ condition: { attr: "PK", exists: false } })
        .send();

      return OrganizationEntity.fromRecord(result.ToolboxItem);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new DuplicateEntityError(
          "Organization",
          "identifier",
          entity.orgName,
        );
      }
      throw error;
    }
  }

  async getOrg(orgName: string): Promise<OrganizationEntity | undefined> {
    const result = await this.record
      .build(GetItemCommand)
      .key({ org_name: orgName })
      .send();

    return result.Item ? OrganizationEntity.fromRecord(result.Item) : undefined;
  }

  async update(entity: OrganizationEntity): Promise<OrganizationEntity> {
    const result = await this.record
      .build(PutItemCommand)
      .item(entity.toRecord())
      .options({ condition: { attr: "PK", exists: true } })
      .send();

    return OrganizationEntity.fromRecord(result.ToolboxItem);
  }

  async deleteOrg(orgName: string): Promise<void> {
    await this.record
      .build(DeleteItemCommand)
      .key({ org_name: orgName })
      .send();
  }

  // Additional methods not in DomainRepository interface but needed for this domain
  async listOrgs(
    limit: number = 10,
    offset?: string,
  ): Promise<OrganizationPage> {
    const scanOperation = this.table.build(QueryCommand).scan();

    if (limit) {
      scanOperation.limit(limit);
    }

    if (offset) {
      // Parse the offset to use as ExclusiveStartKey
      const startKey = JSON.parse(offset);
      scanOperation.startKey(startKey);
    }

    const result = await scanOperation.send();

    const organizations =
      result.Items?.map((item) => OrganizationEntity.fromRecord(item)) || [];

    return {
      items: organizations,
      offset: result.LastEvaluatedKey
        ? JSON.stringify(result.LastEvaluatedKey)
        : undefined,
    };
  }
}
