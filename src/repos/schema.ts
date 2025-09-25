import { Table } from "dynamodb-toolbox/table";
import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { boolean } from "dynamodb-toolbox/schema/boolean";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { InputItem, FormattedItem } from "dynamodb-toolbox/entity";
import { DateTime } from "luxon";

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
  }).and((schema) => ({
    PK: string()
      .key()
      .link<typeof schema>(({ username }) => `ACCOUNT#${username}`),
    SK: string()
      .key()
      .link<typeof schema>(({ username }) => `ACCOUNT#${username}`),
    GSI1PK: string().link<typeof schema>(
      ({ username }) => `ACCOUNT#${username}`,
    ),
    GSI1SK: string().link<typeof schema>(
      ({ username }) => `ACCOUNT#${username}`,
    ),
    GSI3PK: string().link<typeof schema>(
      ({ username }) => `ACCOUNT#${username}`,
    ),
    GSI3SK: string().link<typeof schema>(
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
  }).and((schema) => ({
    PK: string()
      .key()
      .link<typeof schema>(({ org_name }) => `ACCOUNT#${org_name}`),
    SK: string()
      .key()
      .link<typeof schema>(({ org_name }) => `ACCOUNT#${org_name}`),
    GSI1PK: string().link<typeof schema>(
      ({ org_name }) => `ACCOUNT#${org_name}`,
    ),
    GSI1SK: string().link<typeof schema>(
      ({ org_name }) => `ACCOUNT#${org_name}`,
    ),
    GSI3PK: string().link<typeof schema>(
      ({ org_name }) => `ACCOUNT#${org_name}`,
    ),
    GSI3SK: string().link<typeof schema>(
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
  }).and((schema) => ({
    PK: string()
      .key()
      .link<typeof schema>(
        ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
      ),
    SK: string()
      .key()
      .link<typeof schema>(
        ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
      ),
    GSI1PK: string().link<typeof schema>(
      ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
    ),
    GSI1SK: string().link<typeof schema>(
      ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
    ),
    GSI2PK: string().link<typeof schema>(
      ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
    ),
    GSI2SK: string().link<typeof schema>(
      ({ owner, repo_name }) => `REPO#${owner}#${repo_name}`,
    ),
    GSI3PK: string().link<typeof schema>(({ owner }) => `ACCOUNT#${owner}`),
    GSI3SK: string().link<typeof schema>(() => `${DateTime.utc()}`),
  })),
} as const);
type RepoRecord = typeof RepoRecord;
type RepoInput = InputItem<typeof RepoRecord>;
type RepoFormatted = FormattedItem<typeof RepoRecord>;

type GithubSchema = {
  table: GithubTable;
  user: UserRecord;
  organization: OrganizationRecord;
  repository: RepoRecord;
};

const initializeSchema = (client: DynamoDBClient): GithubSchema => {
  GithubTable.documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });

  return {
    table: GithubTable,
    user: UserRecord,
    organization: OrganizationRecord,
    repository: RepoRecord,
  };
};

function encodePageToken(
  lastEvaluated?: Record<string, any>,
): string | undefined {
  return lastEvaluated
    ? encodeURIComponent(btoa(JSON.stringify(lastEvaluated)))
    : undefined;
}

function decodePageToken(token?: string): Record<string, any> | undefined {
  return token ? JSON.parse(atob(decodeURIComponent(token))) : undefined;
}

export { initializeSchema, encodePageToken, decodePageToken };
export type {
  GithubSchema,
  GithubTable,
  UserRecord,
  OrganizationRecord,
  RepoRecord,
  UserInput,
  UserFormatted,
  OrganizationInput,
  OrganizationFormatted,
  RepoInput,
  RepoFormatted,
};
