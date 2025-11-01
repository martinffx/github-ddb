import {
	ConditionalCheckFailedException,
	TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	DynamoDBToolboxError,
	ConditionCheck,
} from "dynamodb-toolbox";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { RepositoryEntity } from "../services";
import type { PaginatedResponse } from "../routes/schema";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import {
	decodePageToken,
	encodePageToken,
	type GithubTable,
	type RepoFormatted,
	type RepoRecord,
	type UserRecord,
	type OrganizationRecord,
} from "./schema";
import type { RepositoryId } from "../services/entities/RepositoryEntity";

type ListOptions = {
	limit?: number;
	offset?: string;
};

export class RepoRepository {
	private readonly table: GithubTable;
	private readonly record: RepoRecord;
	private readonly userRecord: UserRecord;

	constructor(
		table: GithubTable,
		record: RepoRecord,
		userRecord: UserRecord,
		_orgRecord: OrganizationRecord,
	) {
		this.table = table;
		this.record = record;
		this.userRecord = userRecord;
	}

	async createRepo(repo: RepositoryEntity): Promise<RepositoryEntity> {
		try {
			// Build transaction to put repository with duplicate check
			const putRepoTransaction = this.record
				.build(PutTransaction)
				.item(repo.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify owner exists
			// Try user first (can be either user or organization)
			const ownerCheckTransaction = this.userRecord
				.build(ConditionCheck)
				.key({ username: repo.owner })
				.condition({ attr: "PK", exists: true });

			// Execute both in a transaction
			await execute(putRepoTransaction, ownerCheckTransaction);

			// If successful, fetch the created item
			const result = await this.getRepo({
				owner: repo.owner,
				repo_name: repo.repoName,
			});

			if (!result) {
				throw new Error("Failed to retrieve created repository");
			}

			return result;
		} catch (error: unknown) {
			if (
				error instanceof TransactionCanceledException ||
				error instanceof ConditionalCheckFailedException
			) {
				// Transaction failed - could be either duplicate repo or missing owner
				// Check if it's a duplicate by trying to get the repo
				const existing = await this.getRepo({
					owner: repo.owner,
					repo_name: repo.repoName,
				});

				if (existing) {
					throw new DuplicateEntityError(
						"RepositoryEntity",
						`REPO#${repo.owner}#${repo.repoName}`,
					);
				}

				// If repo doesn't exist, owner must not exist
				throw new ValidationError(
					"owner",
					`Owner '${repo.owner}' does not exist`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "repository", error.message);
			}
			throw error;
		}
	}

	async getRepo(id: RepositoryId): Promise<RepositoryEntity | undefined> {
		const result = await this.record
			.build(GetItemCommand)
			.key({
				owner: id.owner,
				repo_name: id.repo_name,
			})
			.send();

		return result.Item ? RepositoryEntity.fromRecord(result.Item) : undefined;
	}

	async updateRepo(repo: RepositoryEntity): Promise<RepositoryEntity> {
		try {
			const result = await this.record
				.build(PutItemCommand)
				.item(repo.toRecord())
				.options({ condition: { attr: "PK", exists: true } })
				.send();

			return RepositoryEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			if (error instanceof ConditionalCheckFailedException) {
				throw new EntityNotFoundError(
					"RepositoryEntity",
					`REPO#${repo.owner}#${repo.repoName}`,
				);
			}
			if (error instanceof DynamoDBToolboxError) {
				throw new ValidationError(error.path ?? "repository", error.message);
			}
			throw error;
		}
	}

	async deleteRepo(id: RepositoryId): Promise<void> {
		await this.record
			.build(DeleteItemCommand)
			.key({
				owner: id.owner,
				repo_name: id.repo_name,
			})
			.send();
	}

	async listByOwner(
		owner: string,
		options: ListOptions = {},
	): Promise<PaginatedResponse<RepositoryEntity>> {
		const { limit = 50, offset } = options;

		const result = await this.table
			.build(QueryCommand)
			.query({
				partition: `ACCOUNT#${owner}`,
				index: "GSI3",
				range: { lt: "ACCOUNT#" }, // Only repositories (timestamps < "ACCOUNT#")
			})
			.options({
				reverse: true,
				exclusiveStartKey: decodePageToken(offset),
				limit,
			})
			.send();

		const items =
			result.Items?.map((item) =>
				RepositoryEntity.fromRecord(item as RepoFormatted),
			) || [];

		return {
			items,
			offset: encodePageToken(result.LastEvaluatedKey),
		};
	}
}
