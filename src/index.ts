/**
 * Main application entry point
 * Sets up Fastify server with DynamoDB connection and routes
 */
import Fastify from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { Config } from "./config";
import {
	IssueRoutes,
	OrganizationRoutes,
	PullRequestRoutes,
	RepositoryRoutes,
	StarRoutes,
	StarUserRoutes,
	StarRepoRoutes,
	UserRoutes,
} from "./routes";
import { errorHandlerPlugin } from "./routes/errorHandler";
import { buildServices, type Services, servicesPlugin } from "./services";

/**
 * Create and configure the Fastify application
 */
type AppOpts = {
	config: Config;
	services: Services;
};
async function createApp({ config, services }: AppOpts) {
	const env = config.env;

	// Create Fastify instance with TypeBox type provider
	const app = Fastify({
		logger: {
			level: config.isDevelopment() ? "info" : "warn",
			transport: config.isDevelopment()
				? {
						target: "pino-pretty",
						options: {
							translateTime: "HH:MM:ss Z",
							ignore: "pid,hostname",
						},
					}
				: undefined,
		},
	}).withTypeProvider<TypeBoxTypeProvider>();

	// Register Swagger for OpenAPI documentation
	await app.register(swagger, {
		openapi: {
			info: {
				title: "GitHub DynamoDB API",
				description:
					"REST API for managing GitHub-like entities (Users, Organizations, Repositories, Issues, Pull Requests) backed by DynamoDB",
				version: "1.0.0",
			},
			tags: [
				{ name: "User", description: "User management endpoints" },
				{
					name: "Organization",
					description: "Organization management endpoints",
				},
				{ name: "Repository", description: "Repository management endpoints" },
				{ name: "Issue", description: "Issue management endpoints" },
				{
					name: "Pull Request",
					description: "Pull request management endpoints",
				},
				{
					name: "Comment",
					description: "Comment management endpoints for issues and PRs",
				},
				{
					name: "Reaction",
					description:
						"Reaction management endpoints for issues, PRs, and comments",
				},
				{ name: "Fork", description: "Fork management endpoints" },
				{ name: "Star", description: "Star management endpoints" },
			],
		},
	});

	// Register Swagger UI for interactive documentation
	await app.register(swaggerUI, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});

	app.register(errorHandlerPlugin);
	app.register(servicesPlugin, { services });

	app.register(UserRoutes, { prefix: "/v1/users" });
	app.register(OrganizationRoutes, { prefix: "/v1/organizations" });
	app.register(RepositoryRoutes, { prefix: "/v1/repositories" });
	// Register IssueRoutes nested under repositories
	app.register(IssueRoutes, {
		prefix: "/v1/repositories/:owner/:repoName/issues",
	});
	// Register PullRequestRoutes nested under repositories
	app.register(PullRequestRoutes, {
		prefix: "/v1/repositories/:owner/:repoName/pulls",
	});
	// Comment and Reaction routes are now handled within IssueRoutes and PullRequestRoutes
	// Fork routes are now handled within RepositoryRoutes
	// Register StarRoutes (will be updated to use repositoryService)
	app.register(StarRoutes, { prefix: "/v1/user/starred" });
	// Register StarUserRoutes
	app.register(StarUserRoutes, { prefix: "/v1/users" });
	// Register StarRepoRoutes
	app.register(StarRepoRoutes, { prefix: "/v1/repositories" });

	// Health check endpoint
	app.get("/health", async () => {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			environment: env,
		};
	});

	return app;
}

/**
 * Build the app for testing
 */
export async function buildApp(config: Config) {
	const services = await buildServices(config);
	return createApp({ services, config });
}

/**
 * Start the server
 */
async function start() {
	try {
		const config = new Config();
		const app = await buildApp(config);
		const serverConfig = config.server;

		// Start listening
		await app.listen({
			port: serverConfig.port,
			host: serverConfig.host,
		});

		// Handle graceful shutdown
		const signals = ["SIGINT", "SIGTERM"] as const;
		for (const signal of signals) {
			process.on(signal, async () => {
				app.log.info(`Received ${signal}, shutting down gracefully...`);
				await app.close();
				process.exit(0);
			});
		}
	} catch (err) {
		console.error("Failed to start server:", err);
		process.exit(1);
	}
}

// Start the server if this file is run directly
if (require.main === module) {
	start();
}

// Export for testing
export { createApp };
