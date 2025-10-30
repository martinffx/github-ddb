/**
 * Main application entry point
 * Sets up Fastify server with DynamoDB connection and routes
 */
import Fastify from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Config } from "./config";
import { OrganizationRoutes, RepositoryRoutes, UserRoutes } from "./routes";
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

  app.register(errorHandlerPlugin);
  app.register(servicesPlugin, { services });

  app.register(UserRoutes, { prefix: "/v1/users" });
  app.register(OrganizationRoutes, { prefix: "/v1/organizations" });
  app.register(RepositoryRoutes, { prefix: "/v1/repositories" });

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
 * Start the server
 */
async function start() {
  try {
    const config = new Config();
    const services = await buildServices(config);
    const app = await createApp({ services, config });
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
