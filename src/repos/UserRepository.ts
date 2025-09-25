import {
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "dynamodb-toolbox";
import { UserEntity } from "../services";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";
import {
  type UserRecord,
  type GithubTable,
  decodePageToken,
  encodePageToken,
} from "./schema";
import { ScanCommand } from "@aws-sdk/client-dynamodb";

type UserPage = {
  offset?: string;
  items: UserEntity[];
};

export class UserRepository {
  private readonly table: GithubTable;
  private readonly entity: UserRecord;

  constructor(table: GithubTable, entity: UserRecord) {
    this.table = table;
    this.entity = entity;
  }

  async getUser(username: string): Promise<UserEntity | undefined> {
    const result = await this.entity
      .build(GetItemCommand)
      .key({ username })
      .send();
    return result.Item ? UserEntity.fromRecord(result.Item) : undefined;
  }

  async listUsers(limit: number = 10, offset?: string): Promise<UserPage> {
    const cmd = this.table
      .build(ScanCommand)
      .entities(this.entity)
      .options({ limit, exclusiveStartKey: decodePageToken(offset) });

    const result = await cmd.send();

    return {
      offset: encodePageToken(result.LastEvaluatedKey),
      items: result.Items?.map((item) => UserEntity.fromRecord(item)) || [],
    };
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    try {
      const result = await this.entity
        .build(PutItemCommand)
        .item(user.toRecord())
        .options({
          condition: { attr: "PK", exists: false },
        })
        .send();

      return UserEntity.fromRecord(result.ToolboxItem);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new DuplicateEntityError("User", "username", user.username);
      }
      throw error;
    }
  }

  async updateUser(user: UserEntity): Promise<UserEntity> {
    try {
      const result = await this.entity
        .build(PutItemCommand)
        .item(user.toRecord())
        .options({
          condition: {
            and: [
              {
                attr: "PK",
                exists: true,
              },
            ],
          },
        })
        .send();

      return UserEntity.fromRecord(result.ToolboxItem);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        throw new EntityNotFoundError("User", "username", user.username);
      }
      throw error;
    }
  }

  async deleteUser(username: string): Promise<void> {
    await this.entity.build(DeleteItemCommand).key({ username }).send();
  }
}
