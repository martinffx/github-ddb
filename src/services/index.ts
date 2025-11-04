import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Config } from "../config";
import {
	ForkRepository,
	IssueCommentRepository,
	IssueRepository,
	OrganizationRepository,
	PRCommentRepository,
	PullRequestRepository,
	ReactionRepository,
	RepoRepository,
	StarRepository,
	UserRepository,
} from "../repos";
import { initializeSchema } from "../repos/schema";
import {
	CommentService,
	ForkService,
	IssueService,
	OrganizationService,
	PullRequestService,
	ReactionService,
	RepositoryService,
	StarService,
	UserService,
} from "../services";

// Define the services that will be available on fastify.services
export interface Services {
	userService: UserService;
	organizationService: OrganizationService;
	repositoryService: RepositoryService;
	issueService: IssueService;
	pullRequestService: PullRequestService;
	commentService: CommentService;
	reactionService: ReactionService;
	forkService: ForkService;
	starService: StarService;
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
	const issueCommentRepository = new IssueCommentRepository(
		schema.table,
		schema.issueComment,
		schema.issue,
	);
	const prCommentRepository = new PRCommentRepository(
		schema.table,
		schema.prComment,
		schema.pullRequest,
	);
	const reactionRepository = new ReactionRepository(
		schema.table,
		schema.reaction,
		schema.issue,
		schema.pullRequest,
		schema.issueComment,
		schema.prComment,
	);
	const forkRepository = new ForkRepository(
		schema.table,
		schema.fork,
		schema.repository,
	);
	const starRepository = new StarRepository(
		schema.table,
		schema.star,
		schema.user,
		schema.repository,
	);

	// Create services
	const userService = new UserService(userRepository);
	const organizationService = new OrganizationService(organizationRepository);
	const repositoryService = new RepositoryService(repoRepository);
	const issueService = new IssueService(issueRepository);
	const pullRequestService = new PullRequestService(pullRequestRepository);
	const commentService = new CommentService(
		issueCommentRepository,
		prCommentRepository,
	);
	const reactionService = new ReactionService(reactionRepository);
	const forkService = new ForkService(forkRepository);
	const starService = new StarService(starRepository);

	return {
		userService,
		organizationService,
		repositoryService,
		issueService,
		pullRequestService,
		commentService,
		reactionService,
		forkService,
		starService,
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
export * from "./CommentService";
export * from "./ReactionService";
export * from "./ForkService";
export * from "./StarService";
