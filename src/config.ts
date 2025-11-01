// Environment variables should be loaded by dotenvx in package.json scripts
// This allows different .env files for different environments

type AWSConfig = {
	region: string;
	endpoint?: string;
	accessKeyId: string;
	secretAccessKey: string;
};

type DatabaseConfig = {
	tableName: string;
};

type ServerConfig = {
	port: number;
	host: string;
};

type ENV = "development" | "test" | "production";
type AppConfig = {
	env: ENV;
	aws: AWSConfig;
	database: DatabaseConfig;
	server: ServerConfig;
};
type ConfigOpts = {
	env?: ENV;
	aws?: AWSConfig;
	database?: DatabaseConfig;
	server?: ServerConfig;
};

class Config {
	public readonly env: ENV;
	public readonly aws: AWSConfig;
	public readonly database: DatabaseConfig;
	public readonly server: ServerConfig;

	constructor({ env, aws, database, server }: ConfigOpts = {}) {
		// Read from environment variables with fallbacks
		this.env = env ?? (process.env.NODE_ENV as ENV) ?? "development";

		this.aws = aws ?? {
			region: process.env.AWS_REGION ?? "us-east-1",
			endpoint: process.env.AWS_ENDPOINT,
			accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "default",
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "default",
		};

		this.database = database ?? {
			tableName: process.env.DYNAMODB_TABLE_NAME ?? "GitHubTable",
		};

		this.server = server ?? {
			port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000,
			host: process.env.HOST ?? "0.0.0.0",
		};
	}

	public isDevelopment(): boolean {
		return this.env === "development";
	}

	public isTest(): boolean {
		return this.env === "test";
	}

	public isProduction(): boolean {
		return this.env === "production";
	}
}

export { Config };
export type { AWSConfig, DatabaseConfig, ServerConfig, AppConfig };
