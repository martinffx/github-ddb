import { UserEntity } from "./UserEntity";
import { OrganizationEntity } from "./OrganizationEntity";
import { RepositoryEntity } from "./RepositoryEntity";
import { DateTime } from "luxon";
import {
	DynamoDBClient,
	CreateTableCommand,
	DescribeTableCommand,
	ResourceNotFoundException,
	ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import { appConfig } from "../../config";
import {
	createTableParams,
	initializeSchema,
	type GithubSchema,
} from "../../repos/schema";

// Simple counter for generating unique test data
let userCounter = 0;
let orgCounter = 0;
let repoCounter = 0;

let client: DynamoDBClient | undefined;
let initializationPromise: Promise<DynamoDBClient> | undefined;

async function ensureTableExists(ddbClient: DynamoDBClient): Promise<void> {
	const tableName = appConfig.database.tableName;

	// Check if table already exists
	try {
		await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
		// Table exists, we're done
		return;
	} catch (error) {
		if (!(error instanceof ResourceNotFoundException)) {
			throw error;
		}
		// Table doesn't exist, proceed to create it
	}

	// Create the table
	const tableParams = createTableParams(tableName);
	try {
		await ddbClient.send(new CreateTableCommand(tableParams));
		// Wait for table to become active
		await waitForTableActive(ddbClient, tableName);
	} catch (error) {
		// If another test worker is creating the table, wait and verify it exists
		if (error instanceof ResourceInUseException) {
			// Wait for the other worker to finish creating the table
			await waitForTableActive(ddbClient, tableName);
			return;
		}
		throw error;
	}
}

async function waitForTableActive(
	ddbClient: DynamoDBClient,
	tableName: string,
	maxAttempts = 30,
): Promise<void> {
	for (let i = 0; i < maxAttempts; i++) {
		try {
			const result = await ddbClient.send(
				new DescribeTableCommand({ TableName: tableName }),
			);
			if (result.Table?.TableStatus === "ACTIVE") {
				return;
			}
		} catch (error) {
			if (!(error instanceof ResourceNotFoundException)) {
				throw error;
			}
		}
		// Wait 100ms before next attempt
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(
		`Table ${tableName} did not become active within ${maxAttempts * 100}ms`,
	);
}

export async function getDDBClient(): Promise<DynamoDBClient> {
	// If already initialized, return immediately
	if (client !== undefined) {
		return client;
	}

	// If initialization is in progress, wait for it
	if (initializationPromise !== undefined) {
		return initializationPromise;
	}

	// Start initialization
	initializationPromise = (async () => {
		const newClient = new DynamoDBClient({
			endpoint: appConfig.aws.endpoint,
			region: appConfig.aws.region,
			credentials: {
				accessKeyId: appConfig.aws.accessKeyId,
				secretAccessKey: appConfig.aws.secretAccessKey,
			},
		});

		await ensureTableExists(newClient);
		client = newClient;
		return newClient;
	})();

	return initializationPromise;
}

/**
 * Create a test UserEntity with sensible defaults
 */
export function createUserEntity(
	overrides: Partial<{
		username: string;
		email: string;
		bio?: string;
		payment_plan_id?: string;
		created_at?: string;
		updated_at?: string;
	}> = {},
): UserEntity {
	const count = ++userCounter;
	return new UserEntity({
		username: `testuser${count}`,
		email: `test${count}@example.com`,
		bio: undefined,
		payment_plan_id: undefined,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides,
	});
}

/**
 * Create a test OrganizationEntity with sensible defaults
 */
export function createOrganizationEntity(
	overrides: Partial<{
		orgName: string;
		description?: string;
		paymentPlanId?: string;
		created?: string;
		modified?: string;
	}> = {},
): OrganizationEntity {
	const count = ++orgCounter;
	return new OrganizationEntity({
		orgName: overrides.orgName ?? `testorg${count}`,
		description: overrides.description,
		paymentPlanId: overrides.paymentPlanId,
		created: overrides.created
			? DateTime.fromISO(overrides.created)
			: undefined,
		modified: overrides.modified
			? DateTime.fromISO(overrides.modified)
			: undefined,
	});
}

/**
 * Create a test RepositoryEntity with sensible defaults
 */
export function createRepositoryEntity(
	overrides: Partial<{
		owner: string;
		repo_name: string;
		description?: string;
		is_private: boolean;
		language?: string;
		created?: string;
		modified?: string;
	}> = {},
): RepositoryEntity {
	const count = ++repoCounter;
	return new RepositoryEntity({
		owner: overrides.owner ?? `testuser${count}`,
		repoName: overrides.repo_name ?? `testrepo${count}`,
		description: overrides.description,
		isPrivate: overrides.is_private ?? false,
		language: overrides.language,
		created: overrides.created
			? DateTime.fromISO(overrides.created)
			: undefined,
		modified: overrides.modified
			? DateTime.fromISO(overrides.modified)
			: undefined,
	});
}

/**
 * Reset all counters - useful for test isolation
 */
export function resetFixtureCounters(): void {
	userCounter = 0;
	orgCounter = 0;
	repoCounter = 0;
}

/**
 * Create a configured GithubSchema with DynamoDB client
 */
export async function createGithubSchema(): Promise<GithubSchema> {
	const client = await getDDBClient();
	return initializeSchema(appConfig.database.tableName, client);
}
