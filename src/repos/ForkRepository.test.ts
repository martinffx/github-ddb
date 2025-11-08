import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { ForkRepository } from "./ForkRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { initializeSchema, createTableParams } from "./schema";
import { ForkEntity } from "../services/entities/ForkEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";

const dynamoClient = new DynamoDBClient({
	endpoint: "http://localhost:8000",
	region: "us-west-2",
	credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
});

let schema: ReturnType<typeof initializeSchema>;
let forkRepo: ForkRepository;
let repoRepo: RepoRepository;
let userRepo: UserRepository;

beforeAll(async () => {
	// Create table
	const testRunId = Date.now();
	const tableName = `test-forks-${testRunId}`;
	await dynamoClient.send(new CreateTableCommand(createTableParams(tableName)));

	// Initialize schema
	schema = initializeSchema(tableName, dynamoClient);
	forkRepo = new ForkRepository(schema.table, schema.fork, schema.repository);
	repoRepo = new RepoRepository(
		schema.table,
		schema.repository,
		schema.user,
		schema.organization,
	);
	userRepo = new UserRepository(schema.user);
}, 15000);

afterAll(() => {
	dynamoClient.destroy();
});

describe("ForkRepository", () => {
	describe("create", () => {
		it("should create a fork with validation of both source and target repos", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const targetOwner = `target-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const targetRepoName = "forked-repo";

			// Create users
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const targetUser = UserEntity.fromRequest({
				username: targetOwner,
				email: `${targetOwner}@test.com`,
			});
			await userRepo.createUser(targetUser);

			// Create repositories
			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			const targetRepo = RepositoryEntity.fromRequest({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await repoRepo.createRepo(targetRepo);

			// Create fork
			const fork = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});

			const created = await forkRepo.create(fork);

			expect(created.originalOwner).toBe(sourceOwner);
			expect(created.originalRepo).toBe(sourceRepoName);
			expect(created.forkOwner).toBe(targetOwner);
			expect(created.forkRepo).toBe(targetRepoName);
			expect(created.created).toBeDefined();
			expect(created.modified).toBeDefined();

			// Cleanup
			await forkRepo.delete(sourceOwner, sourceRepoName, targetOwner);
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.deleteRepo({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await userRepo.deleteUser(sourceOwner);
			await userRepo.deleteUser(targetOwner);
		});

		it("should prevent duplicate forks (same source/target)", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const targetOwner = `target-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const targetRepoName = "forked-repo";

			// Create users and repos
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const targetUser = UserEntity.fromRequest({
				username: targetOwner,
				email: `${targetOwner}@test.com`,
			});
			await userRepo.createUser(targetUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			const targetRepo = RepositoryEntity.fromRequest({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await repoRepo.createRepo(targetRepo);

			// Create first fork
			const fork1 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});
			await forkRepo.create(fork1);

			// Try to create duplicate
			const fork2 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});

			await expect(forkRepo.create(fork2)).rejects.toThrow(
				DuplicateEntityError,
			);

			// Cleanup
			await forkRepo.delete(sourceOwner, sourceRepoName, targetOwner);
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.deleteRepo({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await userRepo.deleteUser(sourceOwner);
			await userRepo.deleteUser(targetOwner);
		});

		it("should fail when source repo doesn't exist", async () => {
			const testRunId = Date.now();
			const sourceOwner = `nonexistent-source-${testRunId}`;
			const targetOwner = `target-owner-${testRunId}`;
			const sourceRepoName = "nonexistent-repo";
			const targetRepoName = "forked-repo";

			// Create target user and repo only
			const targetUser = UserEntity.fromRequest({
				username: targetOwner,
				email: `${targetOwner}@test.com`,
			});
			await userRepo.createUser(targetUser);

			const targetRepo = RepositoryEntity.fromRequest({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await repoRepo.createRepo(targetRepo);

			// Try to create fork with nonexistent source
			const fork = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});

			await expect(forkRepo.create(fork)).rejects.toThrow(EntityNotFoundError);

			// Cleanup
			await repoRepo.deleteRepo({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await userRepo.deleteUser(targetOwner);
		});

		it("should fail when target repo doesn't exist", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const targetOwner = `nonexistent-target-${testRunId}`;
			const sourceRepoName = "original-repo";
			const targetRepoName = "nonexistent-repo";

			// Create source user and repo only
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			// Try to create fork with nonexistent target
			const fork = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});

			await expect(forkRepo.create(fork)).rejects.toThrow(EntityNotFoundError);

			// Cleanup
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await userRepo.deleteUser(sourceOwner);
		});
	});

	describe("get", () => {
		it("should get a specific fork", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const targetOwner = `target-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const targetRepoName = "forked-repo";

			// Setup users and repos
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const targetUser = UserEntity.fromRequest({
				username: targetOwner,
				email: `${targetOwner}@test.com`,
			});
			await userRepo.createUser(targetUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			const targetRepo = RepositoryEntity.fromRequest({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await repoRepo.createRepo(targetRepo);

			// Create fork
			const fork = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});
			await forkRepo.create(fork);

			// Get fork
			const retrieved = await forkRepo.get(
				sourceOwner,
				sourceRepoName,
				targetOwner,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.originalOwner).toBe(sourceOwner);
			expect(retrieved?.originalRepo).toBe(sourceRepoName);
			expect(retrieved?.forkOwner).toBe(targetOwner);
			expect(retrieved?.forkRepo).toBe(targetRepoName);

			// Cleanup
			await forkRepo.delete(sourceOwner, sourceRepoName, targetOwner);
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.deleteRepo({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await userRepo.deleteUser(sourceOwner);
			await userRepo.deleteUser(targetOwner);
		});

		it("should return undefined for nonexistent fork", async () => {
			const testRunId = Date.now();
			const result = await forkRepo.get(
				`nonexistent-${testRunId}`,
				"repo",
				"owner",
			);
			expect(result).toBeUndefined();
		});
	});

	describe("listForksOfRepo", () => {
		it("should list all forks of a repository using GSI2 query", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const forkOwner1 = `fork-owner1-${testRunId}`;
			const forkOwner2 = `fork-owner2-${testRunId}`;

			// Create source user and repo
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			// Create fork users and repos
			const fork1User = UserEntity.fromRequest({
				username: forkOwner1,
				email: `${forkOwner1}@test.com`,
			});
			await userRepo.createUser(fork1User);

			const fork1Repo = RepositoryEntity.fromRequest({
				owner: forkOwner1,
				repo_name: "forked-repo-1",
			});
			await repoRepo.createRepo(fork1Repo);

			const fork2User = UserEntity.fromRequest({
				username: forkOwner2,
				email: `${forkOwner2}@test.com`,
			});
			await userRepo.createUser(fork2User);

			const fork2Repo = RepositoryEntity.fromRequest({
				owner: forkOwner2,
				repo_name: "forked-repo-2",
			});
			await repoRepo.createRepo(fork2Repo);

			// Create two forks
			const fork1 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: forkOwner1,
				fork_repo: "forked-repo-1",
			});
			await forkRepo.create(fork1);

			const fork2 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: forkOwner2,
				fork_repo: "forked-repo-2",
			});
			await forkRepo.create(fork2);

			// List all forks
			const forks = await forkRepo.listForksOfRepo(sourceOwner, sourceRepoName);

			expect(forks).toHaveLength(2);
			expect(forks.map((f) => f.forkOwner)).toContain(forkOwner1);
			expect(forks.map((f) => f.forkOwner)).toContain(forkOwner2);

			// Cleanup
			await forkRepo.delete(sourceOwner, sourceRepoName, forkOwner1);
			await forkRepo.delete(sourceOwner, sourceRepoName, forkOwner2);
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.deleteRepo({
				owner: forkOwner1,
				repo_name: "forked-repo-1",
			});
			await repoRepo.deleteRepo({
				owner: forkOwner2,
				repo_name: "forked-repo-2",
			});
			await userRepo.deleteUser(sourceOwner);
			await userRepo.deleteUser(forkOwner1);
			await userRepo.deleteUser(forkOwner2);
		});

		it("should return empty array when no forks exist", async () => {
			const testRunId = Date.now();
			const result = await forkRepo.listForksOfRepo(
				`nonexistent-${testRunId}`,
				"repo",
			);
			expect(result).toEqual([]);
		});
	});

	describe("delete", () => {
		it("should delete a fork", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const targetOwner = `target-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const targetRepoName = "forked-repo";

			// Setup users and repos
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const targetUser = UserEntity.fromRequest({
				username: targetOwner,
				email: `${targetOwner}@test.com`,
			});
			await userRepo.createUser(targetUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			const targetRepo = RepositoryEntity.fromRequest({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await repoRepo.createRepo(targetRepo);

			// Create fork
			const fork = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: targetOwner,
				fork_repo: targetRepoName,
			});
			await forkRepo.create(fork);

			// Verify it exists
			let retrieved = await forkRepo.get(
				sourceOwner,
				sourceRepoName,
				targetOwner,
			);
			expect(retrieved).toBeDefined();

			// Delete fork
			await forkRepo.delete(sourceOwner, sourceRepoName, targetOwner);

			// Verify it's gone
			retrieved = await forkRepo.get(sourceOwner, sourceRepoName, targetOwner);
			expect(retrieved).toBeUndefined();

			// Cleanup
			await repoRepo.deleteRepo({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.deleteRepo({
				owner: targetOwner,
				repo_name: targetRepoName,
			});
			await userRepo.deleteUser(sourceOwner);
			await userRepo.deleteUser(targetOwner);
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent fork operations correctly", async () => {
			const testRunId = Date.now();
			const sourceOwner = `source-owner-${testRunId}`;
			const sourceRepoName = "original-repo";
			const forkOwner1 = `fork-owner1-${testRunId}`;
			const forkOwner2 = `fork-owner2-${testRunId}`;
			const forkOwner3 = `fork-owner3-${testRunId}`;

			// Setup source
			const sourceUser = UserEntity.fromRequest({
				username: sourceOwner,
				email: `${sourceOwner}@test.com`,
			});
			await userRepo.createUser(sourceUser);

			const sourceRepo = RepositoryEntity.fromRequest({
				owner: sourceOwner,
				repo_name: sourceRepoName,
			});
			await repoRepo.createRepo(sourceRepo);

			// Setup fork users and repos
			const forkSetup = async (forkOwner: string, repoName: string) => {
				const user = UserEntity.fromRequest({
					username: forkOwner,
					email: `${forkOwner}@test.com`,
				});
				await userRepo.createUser(user);

				const repo = RepositoryEntity.fromRequest({
					owner: forkOwner,
					repo_name: repoName,
				});
				await repoRepo.createRepo(repo);
			};

			await Promise.all([
				forkSetup(forkOwner1, "fork-1"),
				forkSetup(forkOwner2, "fork-2"),
				forkSetup(forkOwner3, "fork-3"),
			]);

			// Create forks concurrently
			const fork1 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: forkOwner1,
				fork_repo: "fork-1",
			});

			const fork2 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: forkOwner2,
				fork_repo: "fork-2",
			});

			const fork3 = ForkEntity.fromRequest({
				original_owner: sourceOwner,
				original_repo: sourceRepoName,
				fork_owner: forkOwner3,
				fork_repo: "fork-3",
			});

			const results = await Promise.all([
				forkRepo.create(fork1),
				forkRepo.create(fork2),
				forkRepo.create(fork3),
			]);

			expect(results).toHaveLength(3);
			expect(results.map((r) => r.forkOwner)).toContain(forkOwner1);
			expect(results.map((r) => r.forkOwner)).toContain(forkOwner2);
			expect(results.map((r) => r.forkOwner)).toContain(forkOwner3);

			// Verify all created
			const forks = await forkRepo.listForksOfRepo(sourceOwner, sourceRepoName);
			expect(forks).toHaveLength(3);

			// Cleanup
			await Promise.all([
				forkRepo.delete(sourceOwner, sourceRepoName, forkOwner1),
				forkRepo.delete(sourceOwner, sourceRepoName, forkOwner2),
				forkRepo.delete(sourceOwner, sourceRepoName, forkOwner3),
			]);

			await Promise.all([
				repoRepo.deleteRepo({ owner: sourceOwner, repo_name: sourceRepoName }),
				repoRepo.deleteRepo({ owner: forkOwner1, repo_name: "fork-1" }),
				repoRepo.deleteRepo({ owner: forkOwner2, repo_name: "fork-2" }),
				repoRepo.deleteRepo({ owner: forkOwner3, repo_name: "fork-3" }),
			]);

			await Promise.all([
				userRepo.deleteUser(sourceOwner),
				userRepo.deleteUser(forkOwner1),
				userRepo.deleteUser(forkOwner2),
				userRepo.deleteUser(forkOwner3),
			]);
		});
	});
});
