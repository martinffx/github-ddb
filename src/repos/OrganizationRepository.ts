import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
	DynamoDBToolboxError,
} from "dynamodb-toolbox";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import type { OrganizationRecord } from "./schema";

export class OrganizationRepository {
	private readonly record: OrganizationRecord;

	constructor(record: OrganizationRecord) {
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
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new DuplicateEntityError("OrganizationEntity", entity.orgName);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "organization", error.message);
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

	async updateOrg(entity: OrganizationEntity): Promise<OrganizationEntity> {
		try {
			const result = await this.record
				.build(PutItemCommand)
				.item(entity.toRecord())
				.options({ condition: { attr: "PK", exists: true } })
				.send();

			return OrganizationEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new EntityNotFoundError("OrganizationEntity", entity.orgName);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError("", error.message);
			}
			throw error;
		}
	}

	async deleteOrg(orgName: string): Promise<void> {
		await this.record
			.build(DeleteItemCommand)
			.key({ org_name: orgName })
			.send();
	}
}
