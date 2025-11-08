import {
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
} from "dynamodb-toolbox";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import type { OrganizationRecord } from "./schema";
import { handleCreateError, handleUpdateError } from "./utils";

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
			handleCreateError(error, "OrganizationEntity", entity.getEntityKey());
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
			handleUpdateError(error, "OrganizationEntity", entity.getEntityKey());
		}
	}

	async deleteOrg(orgName: string): Promise<void> {
		await this.record
			.build(DeleteItemCommand)
			.key({ org_name: orgName })
			.send();
	}
}
