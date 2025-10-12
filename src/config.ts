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

type AppConfig = {
	env: "development" | "test" | "production";
	aws: AWSConfig;
	database: DatabaseConfig;
};

class Config {
	private static instance: Config;
	private readonly config: AppConfig;

	private constructor() {
		this.config = this.loadConfig();
	}

	public static getInstance(): Config {
		if (!Config.instance) {
			Config.instance = new Config();
		}
		return Config.instance;
	}

	private loadConfig(): AppConfig {
		const env = (process.env.NODE_ENV || "development") as AppConfig["env"];

		// Required environment variables
		const requiredVars = {
			AWS_REGION: process.env.AWS_REGION,
			AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
			AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
			DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
		};

		// Check for missing required variables
		const missingVars = Object.entries(requiredVars)
			.filter(([_, value]) => !value)
			.map(([key]) => key);

		if (missingVars.length > 0) {
			throw new Error(
				`Missing required environment variables: ${missingVars.join(", ")}`,
			);
		}

		return {
			env,
			aws: {
				region: requiredVars.AWS_REGION ?? "us-east-1",
				endpoint: process.env.AWS_ENDPOINT, // Optional for local development
				accessKeyId: requiredVars.AWS_ACCESS_KEY_ID ?? "default",
				secretAccessKey: requiredVars.AWS_SECRET_ACCESS_KEY ?? "default",
			},
			database: {
				tableName: requiredVars.DYNAMODB_TABLE_NAME ?? "GitHubTable",
			},
		};
	}

	public get env(): AppConfig["env"] {
		return this.config.env;
	}

	public get aws(): AWSConfig {
		return this.config.aws;
	}

	public get database(): DatabaseConfig {
		return this.config.database;
	}

	public isDevelopment(): boolean {
		return this.config.env === "development";
	}

	public isTest(): boolean {
		return this.config.env === "test";
	}

	public isProduction(): boolean {
		return this.config.env === "production";
	}
}

// Export singleton instance
export const appConfig = Config.getInstance();

// Export types for use in other modules
export type { AWSConfig, DatabaseConfig, AppConfig };
