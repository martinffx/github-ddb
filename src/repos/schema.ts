import { Table } from "dynamodb-toolbox/table";
import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { boolean } from "dynamodb-toolbox/schema/boolean";
import { number } from "dynamodb-toolbox/schema/number";
import { set } from "dynamodb-toolbox/schema/set";
import type {
	CreateTableCommandInput,
	DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { InputItem, FormattedItem } from "dynamodb-toolbox/entity";
import { DateTime } from "luxon";

function createTableParams(tableName: string): CreateTableCommandInput {
	return {
		TableName: tableName,
		KeySchema: [
			{ AttributeName: "PK", KeyType: "HASH" },
			{ AttributeName: "SK", KeyType: "RANGE" },
		],
		AttributeDefinitions: [
			{ AttributeName: "PK", AttributeType: "S" },
			{ AttributeName: "SK", AttributeType: "S" },
			{ AttributeName: "GSI1PK", AttributeType: "S" },
			{ AttributeName: "GSI1SK", AttributeType: "S" },
			{ AttributeName: "GSI2PK", AttributeType: "S" },
			{ AttributeName: "GSI2SK", AttributeType: "S" },
			{ AttributeName: "GSI3PK", AttributeType: "S" },
			{ AttributeName: "GSI3SK", AttributeType: "S" },
			{ AttributeName: "GSI4PK", AttributeType: "S" },
			{ AttributeName: "GSI4SK", AttributeType: "S" },
		],
		GlobalSecondaryIndexes: [
			{
				IndexName: "GSI1",
				KeySchema: [
					{ AttributeName: "GSI1PK", KeyType: "HASH" },
					{ AttributeName: "GSI1SK", KeyType: "RANGE" },
				],
				Projection: { ProjectionType: "ALL" },
			},
			{
				IndexName: "GSI2",
				KeySchema: [
					{ AttributeName: "GSI2PK", KeyType: "HASH" },
					{ AttributeName: "GSI2SK", KeyType: "RANGE" },
				],
				Projection: { ProjectionType: "ALL" },
			},
			{
				IndexName: "GSI3",
				KeySchema: [
					{ AttributeName: "GSI3PK", KeyType: "HASH" },
					{ AttributeName: "GSI3SK", KeyType: "RANGE" },
				],
				Projection: { ProjectionType: "ALL" },
			},
			{
				IndexName: "GSI4",
				KeySchema: [
					{ AttributeName: "GSI4PK", KeyType: "HASH" },
					{ AttributeName: "GSI4SK", KeyType: "RANGE" },
				],
				Projection: { ProjectionType: "ALL" },
			},
		],
		BillingMode: "PAY_PER_REQUEST",
	};
}
const GithubTable = new Table({
	name: "GitHubTable",
	partitionKey: { name: "PK", type: "string" },
	sortKey: { name: "SK", type: "string" },
	indexes: {
		GSI1: {
			type: "global",
			partitionKey: { name: "GSI1PK", type: "string" },
			sortKey: { name: "GSI1SK", type: "string" },
		},
		GSI2: {
			type: "global",
			partitionKey: { name: "GSI2PK", type: "string" },
			sortKey: { name: "GSI2SK", type: "string" },
		},
		GSI3: {
			type: "global",
			partitionKey: { name: "GSI3PK", type: "string" },
			sortKey: { name: "GSI3SK", type: "string" },
		},
		GSI4: {
			type: "global",
			partitionKey: { name: "GSI4PK", type: "string" },
			sortKey: { name: "GSI4SK", type: "string" },
		},
	},
});
type GithubTable = typeof GithubTable;

const UserRecord = new Entity({
	name: "User",
	table: GithubTable,
	schema: item({
		username: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		email: string()
			.required()
			.validate((value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
		bio: string().optional(),
		payment_plan_id: string().optional(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(({ username }) => `ACCOUNT#${username}`),
		SK: string()
			.key()
			.link<typeof _schema>(({ username }) => `ACCOUNT#${username}`),
		GSI1PK: string().link<typeof _schema>(
			({ username }) => `ACCOUNT#${username}`,
		),
		GSI1SK: string().link<typeof _schema>(
			({ username }) => `ACCOUNT#${username}`,
		),
		GSI3PK: string().link<typeof _schema>(
			({ username }) => `ACCOUNT#${username}`,
		),
		GSI3SK: string().link<typeof _schema>(
			({ username }) => `ACCOUNT#${username}`,
		),
	})),
} as const);
type UserRecord = typeof UserRecord;
type UserInput = InputItem<typeof UserRecord>;
type UserFormatted = FormattedItem<typeof UserRecord>;

const OrganizationRecord = new Entity({
	name: "Organization",
	table: GithubTable,
	schema: item({
		org_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		description: string().optional(),
		payment_plan_id: string().optional(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(({ org_name }) => `ACCOUNT#${org_name}`),
		SK: string()
			.key()
			.link<typeof _schema>(({ org_name }) => `ACCOUNT#${org_name}`),
		GSI1PK: string().link<typeof _schema>(
			({ org_name }) => `ACCOUNT#${org_name}`,
		),
		GSI1SK: string().link<typeof _schema>(
			({ org_name }) => `ACCOUNT#${org_name}`,
		),
		GSI3PK: string().link<typeof _schema>(
			({ org_name }) => `ACCOUNT#${org_name}`,
		),
		GSI3SK: string().link<typeof _schema>(
			({ org_name }) => `ACCOUNT#${org_name}`,
		),
	})),
} as const);
type OrganizationRecord = typeof OrganizationRecord;
type OrganizationInput = InputItem<typeof OrganizationRecord>;
type OrganizationFormatted = FormattedItem<typeof OrganizationRecord>;

const RepoRecord = new Entity({
	name: "Repository",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		description: string().optional(),
		is_private: boolean().required().default(false),
		language: string().optional(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		GSI1PK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI1SK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI2PK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI2SK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI3PK: string().link<typeof _schema>(({ owner }) => `ACCOUNT#${owner}`),
		GSI3SK: string()
			.default(() => DateTime.utc().toISO())
			.savedAs("GSI3SK"),
	})),
} as const);
type RepoRecord = typeof RepoRecord;
type RepoInput = InputItem<typeof RepoRecord>;
type RepoFormatted = FormattedItem<typeof RepoRecord>;

const CounterRecord = new Entity({
	name: "Counter",
	table: GithubTable,
	schema: item({
		org_id: string().required().key(),
		repo_id: string().required().key(),
		current_value: number().required().default(0),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ org_id, repo_id }) => `COUNTER#${org_id}#${repo_id}`,
			),
		SK: string().key().default("METADATA"),
	})),
} as const);
type CounterRecord = typeof CounterRecord;
type CounterInput = InputItem<typeof CounterRecord>;
type CounterFormatted = FormattedItem<typeof CounterRecord>;

const IssueRecord = new Entity({
	name: "Issue",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		issue_number: number().required().key(),
		title: string()
			.required()
			.validate((value: string) => value.length <= 255),
		body: string().optional(),
		status: string().required().default("open"),
		author: string().required(),
		assignees: set(string()).optional(),
		labels: set(string()).optional(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ issue_number }) => `ISSUE#${String(issue_number).padStart(6, "0")}`,
			),
		GSI4PK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI4SK: string().link<typeof _schema>(({ issue_number, status }) => {
			if (status === "open") {
				const reverseNumber = String(999999 - issue_number).padStart(6, "0");
				return `ISSUE#OPEN#${reverseNumber}`;
			}
			const paddedNumber = String(issue_number).padStart(6, "0");
			return `#ISSUE#CLOSED#${paddedNumber}`;
		}),
	})),
} as const);
type IssueRecord = typeof IssueRecord;
type IssueInput = InputItem<typeof IssueRecord>;
type IssueFormatted = FormattedItem<typeof IssueRecord>;

const PullRequestRecord = new Entity({
	name: "PullRequest",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		pr_number: number().required().key(),
		title: string()
			.required()
			.validate((value: string) => value.length <= 255),
		body: string().optional(),
		status: string().required().default("open"),
		author: string().required(),
		source_branch: string().required(),
		target_branch: string().required(),
		merge_commit_sha: string().optional(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ pr_number }) => `PR#${String(pr_number).padStart(6, "0")}`,
			),
		GSI1PK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI1SK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI4PK: string().link<typeof _schema>(
			({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
		),
		GSI4SK: string().link<typeof _schema>(({ pr_number, status }) => {
			if (status === "open") {
				const reverseNumber = String(999999 - pr_number).padStart(6, "0");
				return `PR#OPEN#${reverseNumber}`;
			}
			const paddedNumber = String(pr_number).padStart(6, "0");
			if (status === "merged") {
				return `#PR#MERGED#${paddedNumber}`;
			}
			return `#PR#CLOSED#${paddedNumber}`;
		}),
	})),
} as const);
type PullRequestRecord = typeof PullRequestRecord;
type PullRequestInput = InputItem<typeof PullRequestRecord>;
type PullRequestFormatted = FormattedItem<typeof PullRequestRecord>;

const IssueCommentRecord = new Entity({
	name: "IssueComment",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		issue_number: number().required().key(),
		comment_id: string().required().key(),
		body: string().required(),
		author: string().required(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ issue_number, comment_id }) =>
					`ISSUE#${String(issue_number).padStart(6, "0")}#COMMENT#${comment_id}`,
			),
	})),
} as const);
type IssueCommentRecord = typeof IssueCommentRecord;
type IssueCommentInput = InputItem<typeof IssueCommentRecord>;
type IssueCommentFormatted = FormattedItem<typeof IssueCommentRecord>;

const PRCommentRecord = new Entity({
	name: "PRComment",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		pr_number: number().required().key(),
		comment_id: string().required().key(),
		body: string().required(),
		author: string().required(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ pr_number, comment_id }) =>
					`PR#${String(pr_number).padStart(6, "0")}#COMMENT#${comment_id}`,
			),
	})),
} as const);
type PRCommentRecord = typeof PRCommentRecord;
type PRCommentInput = InputItem<typeof PRCommentRecord>;
type PRCommentFormatted = FormattedItem<typeof PRCommentRecord>;

const ReactionRecord = new Entity({
	name: "Reaction",
	table: GithubTable,
	schema: item({
		owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		target_type: string()
			.required()
			.validate((value: string) =>
				["ISSUE", "PR", "ISSUECOMMENT", "PRCOMMENT"].includes(value),
			)
			.key(),
		target_id: string().required().key(),
		user: string().required().key(),
		emoji: string()
			.required()
			.validate((value: string) => /^[\p{Emoji}]+$/u.test(value))
			.key(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ target_type, target_id, user, emoji }) =>
					`REACTION#${target_type}#${target_id}#${user}#${emoji}`,
			),
	})),
} as const);
type ReactionRecord = typeof ReactionRecord;
type ReactionInput = InputItem<typeof ReactionRecord>;
type ReactionFormatted = FormattedItem<typeof ReactionRecord>;

const ForkRecord = new Entity({
	name: "Fork",
	table: GithubTable,
	schema: item({
		original_owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		original_repo: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
		fork_owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		fork_repo: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value)),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(
				({ original_owner, original_repo }) =>
					`REPO#${original_owner}#${original_repo}`,
			),
		SK: string()
			.key()
			.link<typeof _schema>(({ fork_owner }) => `FORK#${fork_owner}`),
		GSI2PK: string().link<typeof _schema>(
			({ original_owner, original_repo }) =>
				`REPO#${original_owner}#${original_repo}`,
		),
		GSI2SK: string().link<typeof _schema>(
			({ fork_owner }) => `FORK#${fork_owner}`,
		),
	})),
} as const);
type ForkRecord = typeof ForkRecord;
type ForkInput = InputItem<typeof ForkRecord>;
type ForkFormatted = FormattedItem<typeof ForkRecord>;

const StarRecord = new Entity({
	name: "Star",
	table: GithubTable,
	schema: item({
		username: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_owner: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_-]+$/.test(value))
			.key(),
		repo_name: string()
			.required()
			.validate((value: string) => /^[a-zA-Z0-9_.-]+$/.test(value))
			.key(),
	}).and((_schema) => ({
		PK: string()
			.key()
			.link<typeof _schema>(({ username }) => `ACCOUNT#${username}`),
		SK: string()
			.key()
			.link<typeof _schema>(
				({ repo_owner, repo_name }) => `STAR#${repo_owner}#${repo_name}`,
			),
	})),
} as const);
type StarRecord = typeof StarRecord;
type StarInput = InputItem<typeof StarRecord>;
type StarFormatted = FormattedItem<typeof StarRecord>;

type GithubSchema = {
	table: GithubTable;
	user: UserRecord;
	organization: OrganizationRecord;
	repository: RepoRecord;
	counter: CounterRecord;
	issue: IssueRecord;
	pullRequest: PullRequestRecord;
	issueComment: IssueCommentRecord;
	prComment: PRCommentRecord;
	reaction: ReactionRecord;
	fork: ForkRecord;
	star: StarRecord;
};

const initializeSchema = (
	tableName: string,
	client: DynamoDBClient,
): GithubSchema => {
	GithubTable.documentClient = DynamoDBDocumentClient.from(client, {
		marshallOptions: {
			removeUndefinedValues: true,
			convertEmptyValues: false,
		},
	});
	GithubTable.tableName = tableName;

	return {
		table: GithubTable,
		user: UserRecord,
		organization: OrganizationRecord,
		repository: RepoRecord,
		counter: CounterRecord,
		issue: IssueRecord,
		pullRequest: PullRequestRecord,
		issueComment: IssueCommentRecord,
		prComment: PRCommentRecord,
		reaction: ReactionRecord,
		fork: ForkRecord,
		star: StarRecord,
	};
};

function encodePageToken(
	lastEvaluated?: Record<string, unknown>,
): string | undefined {
	return lastEvaluated
		? encodeURIComponent(btoa(JSON.stringify(lastEvaluated)))
		: undefined;
}

function decodePageToken(token?: string): Record<string, unknown> | undefined {
	return token ? JSON.parse(atob(decodeURIComponent(token))) : undefined;
}

export {
	initializeSchema,
	encodePageToken,
	decodePageToken,
	createTableParams,
};
export type {
	GithubSchema,
	GithubTable,
	UserRecord,
	OrganizationRecord,
	RepoRecord,
	CounterRecord,
	IssueRecord,
	PullRequestRecord,
	IssueCommentRecord,
	PRCommentRecord,
	ReactionRecord,
	ForkRecord,
	StarRecord,
	UserInput,
	UserFormatted,
	OrganizationInput,
	OrganizationFormatted,
	RepoInput,
	RepoFormatted,
	CounterInput,
	CounterFormatted,
	IssueInput,
	IssueFormatted,
	PullRequestInput,
	PullRequestFormatted,
	IssueCommentInput,
	IssueCommentFormatted,
	PRCommentInput,
	PRCommentFormatted,
	ReactionInput,
	ReactionFormatted,
	ForkInput,
	ForkFormatted,
	StarInput,
	StarFormatted,
};
