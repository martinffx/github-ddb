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
    this.env = env ?? "development";
    this.aws = aws ?? {
      region: "us-east-1",
      accessKeyId: "default",
      secretAccessKey: "default",
    };
    this.database = database ?? {
      tableName: "GitHubTable",
    };
    this.server = server ?? {
      port: 3000,
      host: "0.0.0.0",
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
