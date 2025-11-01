import {
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
	DynamoDBToolboxError,
} from "dynamodb-toolbox";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UserEntity } from "../services";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import type { UserRecord } from "./schema";

export class UserRepository {
	private readonly entity: UserRecord;

	constructor(entity: UserRecord) {
		this.entity = entity;
	}

	async getUser(username: string): Promise<UserEntity | undefined> {
		const result = await this.entity
			.build(GetItemCommand)
			.key({ username })
			.send();
		return result.Item ? UserEntity.fromRecord(result.Item) : undefined;
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
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new DuplicateEntityError("UserEntity", user.username);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "user", error.message);
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
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new EntityNotFoundError("UserEntity", user.username);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError("", error.message);
			}
			throw error;
		}
	}

	async deleteUser(username: string): Promise<void> {
		await this.entity.build(DeleteItemCommand).key({ username }).send();
	}
}
