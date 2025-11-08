import {
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
} from "dynamodb-toolbox";
import { UserEntity } from "../services";
import type { UserRecord } from "./schema";
import { handleCreateError, handleUpdateError } from "./utils";

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
			handleCreateError(error, "UserEntity", user.getEntityKey());
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
			handleUpdateError(error, "UserEntity", user.getEntityKey());
		}
	}

	async deleteUser(username: string): Promise<void> {
		await this.entity.build(DeleteItemCommand).key({ username }).send();
	}
}
