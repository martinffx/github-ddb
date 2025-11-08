import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { StarRepository } from "./StarRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { initializeSchema, createTableParams } from "./schema";
import { StarEntity } from "../services/entities/StarEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";

const dynamoClient = new DynamoDBClient({
	endpoint: "http://localhost:8000",
	region: "us-west-2",
	credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
});

let schema: ReturnType<typeof initializeSchema>;
let starRepo: StarRepository;
let repoRepo: RepoRepository;
let userRepo: UserRepository;

beforeAll(async () => {
	// Create table
	const testRunId = Date.now();
	const tableName = `test-stars-${testRunId}`;
	await dynamoClient.send(new CreateTableCommand(createTableParams(tableName)));

	// Initialize schema
	schema = initializeSchema(tableName, dynamoClient);
	starRepo = new StarRepository(
		schema.table,
		schema.star,
		schema.user,
		schema.repository,
	);
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

describe("StarRepository", () => {
	describe("create", () => {
		it("should create a star with validation of user and repo", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Create user
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			// Create repository
			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create star
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			const created = await starRepo.create(star);

			expect(created.username).toBe(username);
			expect(created.repoOwner).toBe(repoOwner);
			expect(created.repoName).toBe(repoName);
			expect(created.created).toBeDefined();
			expect(created.modified).toBeDefined();

			// Cleanup
			await starRepo.delete(username, repoOwner, repoName);
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username);
		});

		it("should prevent duplicate stars (same user+repo)", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Create user and repo
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create first star
			const star1 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star1);

			// Try to create duplicate
			const star2 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			await expect(starRepo.create(star2)).rejects.toThrow(
				DuplicateEntityError,
			);

			// Cleanup
			await starRepo.delete(username, repoOwner, repoName);
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username);
		});

		it("should fail when user doesn't exist", async () => {
			const testRunId = Date.now();
			const username = `nonexistent-user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Create owner user for repository
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			// Create only repository
			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Try to create star with nonexistent user
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			await expect(starRepo.create(star)).rejects.toThrow(EntityNotFoundError);

			// Cleanup
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
		});

		it("should fail when repo doesn't exist", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "nonexistent-repo";

			// Create only user
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Try to create star with nonexistent repo
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			await expect(starRepo.create(star)).rejects.toThrow(EntityNotFoundError);

			// Cleanup
			await userRepo.deleteUser(username);
		});
	});

	describe("get", () => {
		it("should get a specific star", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Setup user and repo
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create star
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star);

			// Get star
			const retrieved = await starRepo.get(username, repoOwner, repoName);

			expect(retrieved).toBeDefined();
			expect(retrieved?.username).toBe(username);
			expect(retrieved?.repoOwner).toBe(repoOwner);
			expect(retrieved?.repoName).toBe(repoName);

			// Cleanup
			await starRepo.delete(username, repoOwner, repoName);
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username);
		});

		it("should return undefined for nonexistent star", async () => {
			const testRunId = Date.now();
			const result = await starRepo.get(
				`nonexistent-${testRunId}`,
				"owner",
				"repo",
			);
			expect(result).toBeUndefined();
		});
	});

	describe("isStarred", () => {
		it("should return true for existing star", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Setup user and repo
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create star
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star);

			// Check if starred
			const isStarred = await starRepo.isStarred(username, repoOwner, repoName);
			expect(isStarred).toBe(true);

			// Cleanup
			await starRepo.delete(username, repoOwner, repoName);
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username);
		});

		it("should return false for nonexistent star", async () => {
			const testRunId = Date.now();
			const isStarred = await starRepo.isStarred(
				`nonexistent-${testRunId}`,
				"owner",
				"repo",
			);
			expect(isStarred).toBe(false);
		});
	});

	describe("delete", () => {
		it("should delete a star", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "test-repo";

			// Setup user and repo
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create star
			const star = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star);

			// Verify it exists
			let retrieved = await starRepo.get(username, repoOwner, repoName);
			expect(retrieved).toBeDefined();

			// Delete star
			await starRepo.delete(username, repoOwner, repoName);

			// Verify it's gone
			retrieved = await starRepo.get(username, repoOwner, repoName);
			expect(retrieved).toBeUndefined();

			// Cleanup
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username);
		});
	});

	describe("listStarsByUser", () => {
		it("should list all stars by a user using PK + SK begins_with query", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner1 = `owner1-${testRunId}`;
			const repoOwner2 = `owner2-${testRunId}`;
			const repoName1 = "repo1";
			const repoName2 = "repo2";

			// Create user
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner users
			const ownerUser1 = UserEntity.fromRequest({
				username: repoOwner1,
				email: `${repoOwner1}@test.com`,
			});
			await userRepo.createUser(ownerUser1);

			const ownerUser2 = UserEntity.fromRequest({
				username: repoOwner2,
				email: `${repoOwner2}@test.com`,
			});
			await userRepo.createUser(ownerUser2);

			// Create repositories
			const repo1 = RepositoryEntity.fromRequest({
				owner: repoOwner1,
				repo_name: repoName1,
			});
			await repoRepo.createRepo(repo1);

			const repo2 = RepositoryEntity.fromRequest({
				owner: repoOwner2,
				repo_name: repoName2,
			});
			await repoRepo.createRepo(repo2);

			// Create two stars
			const star1 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner1,
				repo_name: repoName1,
			});
			await starRepo.create(star1);

			const star2 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner2,
				repo_name: repoName2,
			});
			await starRepo.create(star2);

			// List all stars by user
			const stars = await starRepo.listStarsByUser(username);

			expect(stars).toHaveLength(2);
			expect(stars.map((s) => s.repoOwner)).toContain(repoOwner1);
			expect(stars.map((s) => s.repoOwner)).toContain(repoOwner2);
			expect(stars.map((s) => s.repoName)).toContain(repoName1);
			expect(stars.map((s) => s.repoName)).toContain(repoName2);

			// Cleanup
			await starRepo.delete(username, repoOwner1, repoName1);
			await starRepo.delete(username, repoOwner2, repoName2);
			await repoRepo.deleteRepo({ owner: repoOwner1, repo_name: repoName1 });
			await repoRepo.deleteRepo({ owner: repoOwner2, repo_name: repoName2 });
			await userRepo.deleteUser(username);
		});

		it("should return empty array when user has no stars", async () => {
			const testRunId = Date.now();
			const result = await starRepo.listStarsByUser(`nonexistent-${testRunId}`);
			expect(result).toEqual([]);
		});
	});

	describe("multiple users starring same repo", () => {
		it("should allow multiple users to star the same repository", async () => {
			const testRunId = Date.now();
			const username1 = `user1-${testRunId}`;
			const username2 = `user2-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "popular-repo";

			// Create users
			const user1 = UserEntity.fromRequest({
				username: username1,
				email: `${username1}@test.com`,
			});
			await userRepo.createUser(user1);

			const user2 = UserEntity.fromRequest({
				username: username2,
				email: `${username2}@test.com`,
			});
			await userRepo.createUser(user2);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			// Create repository
			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Both users star the same repo
			const star1 = StarEntity.fromRequest({
				username: username1,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star1);

			const star2 = StarEntity.fromRequest({
				username: username2,
				repo_owner: repoOwner,
				repo_name: repoName,
			});
			await starRepo.create(star2);

			// Verify both stars exist
			const user1Stars = await starRepo.listStarsByUser(username1);
			const user2Stars = await starRepo.listStarsByUser(username2);

			expect(user1Stars).toHaveLength(1);
			expect(user1Stars[0].repoName).toBe(repoName);
			expect(user2Stars).toHaveLength(1);
			expect(user2Stars[0].repoName).toBe(repoName);

			// Cleanup
			await starRepo.delete(username1, repoOwner, repoName);
			await starRepo.delete(username2, repoOwner, repoName);
			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });
			await userRepo.deleteUser(username1);
			await userRepo.deleteUser(username2);
		});
	});

	describe("same user starring multiple repos", () => {
		it("should allow same user to star multiple repositories", async () => {
			const testRunId = Date.now();
			const username = `user-${testRunId}`;
			const repoOwner1 = `owner1-${testRunId}`;
			const repoOwner2 = `owner2-${testRunId}`;
			const repoName1 = "repo1";
			const repoName2 = "repo2";
			const repoName3 = "repo3";

			// Create user
			const user = UserEntity.fromRequest({
				username,
				email: `${username}@test.com`,
			});
			await userRepo.createUser(user);

			// Create owner users
			const ownerUser1 = UserEntity.fromRequest({
				username: repoOwner1,
				email: `${repoOwner1}@test.com`,
			});
			await userRepo.createUser(ownerUser1);

			const ownerUser2 = UserEntity.fromRequest({
				username: repoOwner2,
				email: `${repoOwner2}@test.com`,
			});
			await userRepo.createUser(ownerUser2);

			// Create multiple repositories
			const repo1 = RepositoryEntity.fromRequest({
				owner: repoOwner1,
				repo_name: repoName1,
			});
			await repoRepo.createRepo(repo1);

			const repo2 = RepositoryEntity.fromRequest({
				owner: repoOwner1,
				repo_name: repoName2,
			});
			await repoRepo.createRepo(repo2);

			const repo3 = RepositoryEntity.fromRequest({
				owner: repoOwner2,
				repo_name: repoName3,
			});
			await repoRepo.createRepo(repo3);

			// Star all repos
			const star1 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner1,
				repo_name: repoName1,
			});
			await starRepo.create(star1);

			const star2 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner1,
				repo_name: repoName2,
			});
			await starRepo.create(star2);

			const star3 = StarEntity.fromRequest({
				username,
				repo_owner: repoOwner2,
				repo_name: repoName3,
			});
			await starRepo.create(star3);

			// Verify all stars exist
			const stars = await starRepo.listStarsByUser(username);

			expect(stars).toHaveLength(3);
			expect(stars.map((s) => s.repoName)).toContain(repoName1);
			expect(stars.map((s) => s.repoName)).toContain(repoName2);
			expect(stars.map((s) => s.repoName)).toContain(repoName3);

			// Cleanup
			await starRepo.delete(username, repoOwner1, repoName1);
			await starRepo.delete(username, repoOwner1, repoName2);
			await starRepo.delete(username, repoOwner2, repoName3);
			await repoRepo.deleteRepo({ owner: repoOwner1, repo_name: repoName1 });
			await repoRepo.deleteRepo({ owner: repoOwner1, repo_name: repoName2 });
			await repoRepo.deleteRepo({ owner: repoOwner2, repo_name: repoName3 });
			await userRepo.deleteUser(username);
		});
	});

	describe("concurrent starring operations", () => {
		it("should handle concurrent star operations correctly", async () => {
			const testRunId = Date.now();
			const username1 = `user1-${testRunId}`;
			const username2 = `user2-${testRunId}`;
			const username3 = `user3-${testRunId}`;
			const repoOwner = `owner-${testRunId}`;
			const repoName = "trending-repo";

			// Setup users
			const userSetup = async (username: string) => {
				const user = UserEntity.fromRequest({
					username,
					email: `${username}@test.com`,
				});
				await userRepo.createUser(user);
			};

			await Promise.all([
				userSetup(username1),
				userSetup(username2),
				userSetup(username3),
			]);

			// Create owner user
			const ownerUser = UserEntity.fromRequest({
				username: repoOwner,
				email: `${repoOwner}@test.com`,
			});
			await userRepo.createUser(ownerUser);

			// Setup repository
			const repo = RepositoryEntity.fromRequest({
				owner: repoOwner,
				repo_name: repoName,
			});
			await repoRepo.createRepo(repo);

			// Create stars concurrently
			const star1 = StarEntity.fromRequest({
				username: username1,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			const star2 = StarEntity.fromRequest({
				username: username2,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			const star3 = StarEntity.fromRequest({
				username: username3,
				repo_owner: repoOwner,
				repo_name: repoName,
			});

			const results = await Promise.all([
				starRepo.create(star1),
				starRepo.create(star2),
				starRepo.create(star3),
			]);

			expect(results).toHaveLength(3);
			expect(results.map((r) => r.username)).toContain(username1);
			expect(results.map((r) => r.username)).toContain(username2);
			expect(results.map((r) => r.username)).toContain(username3);

			// Verify all created
			const user1Starred = await starRepo.isStarred(
				username1,
				repoOwner,
				repoName,
			);
			const user2Starred = await starRepo.isStarred(
				username2,
				repoOwner,
				repoName,
			);
			const user3Starred = await starRepo.isStarred(
				username3,
				repoOwner,
				repoName,
			);

			expect(user1Starred).toBe(true);
			expect(user2Starred).toBe(true);
			expect(user3Starred).toBe(true);

			// Cleanup
			await Promise.all([
				starRepo.delete(username1, repoOwner, repoName),
				starRepo.delete(username2, repoOwner, repoName),
				starRepo.delete(username3, repoOwner, repoName),
			]);

			await repoRepo.deleteRepo({ owner: repoOwner, repo_name: repoName });

			await Promise.all([
				userRepo.deleteUser(username1),
				userRepo.deleteUser(username2),
				userRepo.deleteUser(username3),
			]);
		});
	});
});
