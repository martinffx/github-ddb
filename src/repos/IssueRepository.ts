import {
	ConditionCheck,
	DeleteItemCommand,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	UpdateItemCommand,
	$add,
} from "dynamodb-toolbox";
import { execute } from "dynamodb-toolbox/entity/actions/transactWrite";
import { PutTransaction } from "dynamodb-toolbox/entity/actions/transactPut";
import type {
	GithubTable,
	IssueRecord,
	CounterRecord,
	RepoRecord,
	IssueFormatted,
} from "./schema";
import { IssueEntity } from "../services/entities/IssueEntity";
import { handleTransactionError, handleUpdateError } from "./utils";

export class IssueRepository {
	private readonly table: GithubTable;
	private readonly issueRecord: IssueRecord;
	private readonly counterRecord: CounterRecord;
	private readonly repoRecord: RepoRecord;

	constructor(
		table: GithubTable,
		issueRecord: IssueRecord,
		counterRecord: CounterRecord,
		repoRecord: RepoRecord,
	) {
		this.table = table;
		this.issueRecord = issueRecord;
		this.counterRecord = counterRecord;
		this.repoRecord = repoRecord;
	}

	/**
	 * Create a new issue with sequential numbering
	 * Uses CounterRepository to get next issue number atomically
	 */
	async create(issue: IssueEntity): Promise<IssueEntity> {
		// Get next issue number from counter (atomic operation)
		const issueNumber = await this.incrementCounter(
			issue.owner,
			issue.repoName,
		);

		// Create issue entity with assigned number
		const issueWithNumber = new IssueEntity({
			owner: issue.owner,
			repoName: issue.repoName,
			issueNumber,
			title: issue.title,
			body: issue.body,
			status: issue.status,
			author: issue.author,
			assignees: issue.assignees,
			labels: issue.labels,
		});

		try {
			// Build transaction to put issue with duplicate check
			const putIssueTransaction = this.issueRecord
				.build(PutTransaction)
				.item(issueWithNumber.toRecord())
				.options({ condition: { attr: "PK", exists: false } });

			// Build condition check to verify repository exists
			const repoCheckTransaction = this.repoRecord
				.build(ConditionCheck)
				.key({
					owner: issue.owner,
					repo_name: issue.repoName,
				})
				.condition({ attr: "PK", exists: true });

			// Execute both in a transaction
			await execute(putIssueTransaction, repoCheckTransaction);

			// If successful, fetch the created item
			const created = await this.get(issue.owner, issue.repoName, issueNumber);

			if (!created) {
				throw new Error("Failed to retrieve created issue");
			}

			return created;
		} catch (error: unknown) {
			handleTransactionError(error, {
				entityType: "IssueEntity",
				entityKey: issueWithNumber.getEntityKey(),
				parentEntityType: "RepositoryEntity",
				parentEntityKey: issue.getParentEntityKey(),
				operationName: "issue",
			});
		}
	}

	/**
	 * Get a single issue by owner, repo name, and issue number
	 */
	async get(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<IssueEntity | undefined> {
		const result = await this.issueRecord
			.build(GetItemCommand)
			.key({
				owner,
				repo_name: repoName,
				issue_number: issueNumber,
			})
			.send();

		return result.Item ? IssueEntity.fromRecord(result.Item) : undefined;
	}

	/**
	 * List all issues for a repository
	 * Uses GSI1 to avoid hot partition on main table
	 */
	async list(owner: string, repoName: string): Promise<IssueEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.issueRecord)
			.query({
				partition: `ISSUE#${owner}#${repoName}`,
				index: "GSI1",
			})
			.send();

		return (
			result.Items?.map((item) =>
				IssueEntity.fromRecord(item as IssueFormatted),
			) || []
		);
	}

	/**
	 * List issues by status using GSI4
	 * Open issues: reverse chronological (newest first)
	 * Closed issues: chronological (oldest first)
	 */
	async listByStatus(
		owner: string,
		repoName: string,
		status: "open" | "closed",
	): Promise<IssueEntity[]> {
		const result = await this.table
			.build(QueryCommand)
			.entities(this.issueRecord)
			.query({
				partition: `ISSUE#${owner}#${repoName}`,
				index: "GSI4",
				range: {
					beginsWith: status === "open" ? "ISSUE#OPEN#" : "#ISSUE#CLOSED#",
				},
			})
			.send();

		return (
			result.Items?.map((item) =>
				IssueEntity.fromRecord(item as IssueFormatted),
			) || []
		);
	}

	/**
	 * Update an issue
	 * GSI4 keys are automatically recalculated by schema .link() when status changes
	 */
	async update(issue: IssueEntity): Promise<IssueEntity> {
		try {
			const result = await this.issueRecord
				.build(PutItemCommand)
				.item(issue.toRecord())
				.options({
					condition: { attr: "PK", exists: true },
				})
				.send();

			return IssueEntity.fromRecord(result.ToolboxItem);
		} catch (error: unknown) {
			handleUpdateError(error, "IssueEntity", issue.getEntityKey());
		}
	}

	/**
	 * Delete an issue
	 */
	async delete(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<void> {
		await this.issueRecord
			.build(DeleteItemCommand)
			.key({
				owner,
				repo_name: repoName,
				issue_number: issueNumber,
			})
			.send();
	}

	/**
	 * Atomically increment the counter and return the new value
	 * Private helper method for sequential numbering
	 */
	private async incrementCounter(
		orgId: string,
		repoId: string,
	): Promise<number> {
		const result = await this.counterRecord
			.build(UpdateItemCommand)
			.item({
				org_id: orgId,
				repo_id: repoId,
				current_value: $add(1),
			})
			.options({ returnValues: "ALL_NEW" })
			.send();

		if (!result.Attributes?.current_value) {
			throw new Error(
				"Failed to increment counter: invalid response from DynamoDB",
			);
		}

		return result.Attributes.current_value;
	}
}
