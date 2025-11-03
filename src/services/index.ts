import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Config } from "../config";
import {
	IssueRepository,
	OrganizationRepository,
	PullRequestRepository,
	RepoRepository,
	UserRepository,
} from "../repos";
import { initializeSchema } from "../repos/schema";
import {
	IssueService,
	OrganizationService,
	PullRequestService,
	RepositoryService,
	UserService,
} from "../services";

// Define the services that will be available on fastify.services
export interface Services {
	userService: UserService;
	organizationService: OrganizationService;
	repositoryService: RepositoryService;
	issueService: IssueService;
	pullRequestService: PullRequestService;
}

// Extend Fastify types to include our services decorator
declare module "fastify" {
	interface FastifyInstance {
		services: Services;
	}
}

interface ServicesPluginOptions {
	services: Services;
}

export const buildServices = async (config: Config): Promise<Services> => {
	// Initialize DynamoDB client
	const awsConfig = config.aws;
	const ddbClient = new DynamoDBClient({
		endpoint: awsConfig.endpoint,
		region: awsConfig.region,
		credentials: {
			accessKeyId: awsConfig.accessKeyId,
			secretAccessKey: awsConfig.secretAccessKey,
		},
	});

	// Initialize schema and entities
	const databaseConfig = config.database;
	const schema = initializeSchema(databaseConfig.tableName, ddbClient);

	// Create repositories
	const userRepository = new UserRepository(schema.user);
	const organizationRepository = new OrganizationRepository(
		schema.organization,
	);
	const repoRepository = new RepoRepository(
		schema.table,
		schema.repository,
		schema.user,
		schema.organization,
	);
	const issueRepository = new IssueRepository(
		schema.table,
		schema.issue,
		schema.counter,
		schema.repository,
	);
	const pullRequestRepository = new PullRequestRepository(
		schema.table,
		schema.pullRequest,
		schema.counter,
		schema.repository,
	);

	// Create services
	const userService = new UserService(userRepository);
	const organizationService = new OrganizationService(organizationRepository);
	const repositoryService = new RepositoryService(repoRepository);
	const issueService = new IssueService(issueRepository);
	const pullRequestService = new PullRequestService(pullRequestRepository);

	return {
		userService,
		organizationService,
		repositoryService,
		issueService,
		pullRequestService,
	};
};

/**
 * Services plugin - sets up database connection and decorates fastify with services
 */
export const servicesPlugin: FastifyPluginAsync<ServicesPluginOptions> = fp(
	async (fastify: FastifyInstance, options: ServicesPluginOptions) => {
		const { services } = options;
		fastify.decorate("services", services);
	},
);

// Export all service entities
export * from "./entities";

// Export services
export * from "./UserService";
export * from "./OrganizationService";
export * from "./RepositoryService";
export * from "./IssueService";
export * from "./PullRequestService";
