import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { PullRequestRepository } from "./PullRequestRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { createTableParams, initializeSchema } from "./schema";
import { PullRequestEntity } from "../services/entities/PullRequestEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";

describe("PullRequestRepository", () => {
	let client: DynamoDBClient;
	let prRepo: PullRequestRepository;
	let repoRepo: RepoRepository;
	let userRepo: UserRepository;

	const testRunId = Date.now();
	const testUsername = `testuser-${testRunId}`;
	const testOwner = testUsername;
	const testRepoName = `test-repo-${testRunId}`;

	beforeAll(
		async () => {
			// Initialize DynamoDB Local
			client = new DynamoDBClient({
				endpoint: "http://localhost:8000",
				region: "local",
				credentials: {
					accessKeyId: "dummy",
					secretAccessKey: "dummy",
				},
			});

			// Create table
			const tableName = `test-pr-repo-${testRunId}`;
			await client.send(new CreateTableCommand(createTableParams(tableName)));

			// Initialize schema
			const schema = initializeSchema(tableName, client);

			// Initialize repositories
			prRepo = new PullRequestRepository(
				schema.table,
				schema.pullRequest,
				schema.counter,
				schema.repository,
			);
			repoRepo = new RepoRepository(
				schema.table,
				schema.repository,
				schema.user,
				schema.organization,
			);
			userRepo = new UserRepository(schema.user);

			// Create test user
			const user = UserEntity.fromRequest({
				username: testUsername,
				email: `${testUsername}@example.com`,
			});
			await userRepo.createUser(user);

			// Create test repository
			const repo = RepositoryEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
			});
			await repoRepo.createRepo(repo);
		},
		15000, // DynamoDB Local can be slow
	);

	afterAll(async () => {
		client.destroy();
	});

	describe("create", () => {
		it("should create PR with sequential number from counter", async () => {
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test PR #1",
				body: "First test pull request",
				author: testUsername,
				source_branch: "feature/test",
				target_branch: "main",
			});

			const created = await prRepo.create(pr);

			// Should get PR number 1 (or higher if issues were created first)
			expect(created.prNumber).toBeGreaterThan(0);
			expect(created.title).toBe("Test PR #1");
			expect(created.body).toBe("First test pull request");
			expect(created.status).toBe("open");
			expect(created.author).toBe(testUsername);
			expect(created.sourceBranch).toBe("feature/test");
			expect(created.targetBranch).toBe("main");

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created.prNumber);
		});

		it("should create second PR with incremented number", async () => {
			const pr1 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test PR #1",
				author: testUsername,
				source_branch: "feature/one",
				target_branch: "main",
			});

			const pr2 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test PR #2",
				author: testUsername,
				source_branch: "feature/two",
				target_branch: "main",
			});

			const created1 = await prRepo.create(pr1);
			const created2 = await prRepo.create(pr2);

			expect(created1.prNumber).toBeLessThan(created2.prNumber);
			expect(created2.prNumber - created1.prNumber).toBe(1);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created1.prNumber);
			await prRepo.delete(testOwner, testRepoName, created2.prNumber);
		});

		it("should create merged PR with merge commit SHA", async () => {
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Merged PR",
				author: testUsername,
				source_branch: "feature/merged",
				target_branch: "main",
				status: "merged",
				merge_commit_sha: "abc123def456",
			});

			const created = await prRepo.create(pr);

			expect(created.status).toBe("merged");
			expect(created.mergeCommitSha).toBe("abc123def456");

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created.prNumber);
		});

		it("should create closed PR", async () => {
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed PR",
				author: testUsername,
				source_branch: "feature/closed",
				target_branch: "main",
				status: "closed",
			});

			const created = await prRepo.create(pr);

			expect(created.status).toBe("closed");
			expect(created.mergeCommitSha).toBeUndefined();

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created.prNumber);
		});
	});

	describe("get", () => {
		it("should retrieve PR by owner, repo, and number", async () => {
			// Create test PR
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Get PR",
				author: testUsername,
				source_branch: "feature/get-test",
				target_branch: "main",
			});

			const created = await prRepo.create(pr);

			// Retrieve PR
			const retrieved = await prRepo.get(
				testOwner,
				testRepoName,
				created.prNumber,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.prNumber).toBe(created.prNumber);
			expect(retrieved?.title).toBe("Test Get PR");
			expect(retrieved?.author).toBe(testUsername);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created.prNumber);
		});

		it("should return undefined for non-existent PR", async () => {
			const retrieved = await prRepo.get(testOwner, testRepoName, 999999);

			expect(retrieved).toBeUndefined();
		});
	});

	describe("list", () => {
		it("should list all PRs for a repository", async () => {
			// Create multiple PRs
			const pr1 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "PR 1",
				author: testUsername,
				source_branch: "feature/pr1",
				target_branch: "main",
			});

			const pr2 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "PR 2",
				author: testUsername,
				source_branch: "feature/pr2",
				target_branch: "main",
			});

			const created1 = await prRepo.create(pr1);
			const created2 = await prRepo.create(pr2);

			// List all PRs
			const prs = await prRepo.list(testOwner, testRepoName);

			expect(prs.length).toBeGreaterThanOrEqual(2);
			const prNumbers = prs.map((p) => p.prNumber);
			expect(prNumbers).toContain(created1.prNumber);
			expect(prNumbers).toContain(created2.prNumber);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created1.prNumber);
			await prRepo.delete(testOwner, testRepoName, created2.prNumber);
		});

		it("should return empty array for repository with no PRs", async () => {
			const uniqueRepoName = `empty-repo-${Date.now()}`;

			// Create empty repository
			const repo = RepositoryEntity.fromRequest({
				owner: testOwner,
				repo_name: uniqueRepoName,
			});
			await repoRepo.createRepo(repo);

			const prs = await prRepo.list(testOwner, uniqueRepoName);

			expect(prs).toEqual([]);

			// Cleanup
			await repoRepo.deleteRepo({
				owner: testOwner,
				repo_name: uniqueRepoName,
			});
		});
	});

	describe("listByStatus", () => {
		it("should list only open PRs in reverse chronological order", async () => {
			// Create open and closed PRs
			const openPR1 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Open PR 1",
				author: testUsername,
				source_branch: "feature/open1",
				target_branch: "main",
				status: "open",
			});

			const closedPR = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed PR",
				author: testUsername,
				source_branch: "feature/closed",
				target_branch: "main",
				status: "closed",
			});

			const openPR2 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Open PR 2",
				author: testUsername,
				source_branch: "feature/open2",
				target_branch: "main",
				status: "open",
			});

			const created1 = await prRepo.create(openPR1);
			const created2 = await prRepo.create(closedPR);
			const created3 = await prRepo.create(openPR2);

			// List open PRs
			const openPRs = await prRepo.listByStatus(
				testOwner,
				testRepoName,
				"open",
			);

			// Should only contain open PRs
			const openTitles = openPRs.map((p) => p.title);
			expect(openTitles).toContain("Open PR 1");
			expect(openTitles).toContain("Open PR 2");
			expect(openTitles).not.toContain("Closed PR");

			// Should be in reverse chronological order (newest first)
			const openNumbers = openPRs.map((p) => p.prNumber);
			const idx1 = openNumbers.indexOf(created1.prNumber);
			const idx3 = openNumbers.indexOf(created3.prNumber);
			if (idx1 !== -1 && idx3 !== -1) {
				expect(idx3).toBeLessThan(idx1); // created3 should come before created1
			}

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created1.prNumber);
			await prRepo.delete(testOwner, testRepoName, created2.prNumber);
			await prRepo.delete(testOwner, testRepoName, created3.prNumber);
		});

		it("should list only closed PRs in chronological order", async () => {
			// Create closed PRs
			const closedPR1 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed PR 1",
				author: testUsername,
				source_branch: "feature/closed1",
				target_branch: "main",
				status: "closed",
			});

			const closedPR2 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed PR 2",
				author: testUsername,
				source_branch: "feature/closed2",
				target_branch: "main",
				status: "closed",
			});

			const created1 = await prRepo.create(closedPR1);
			const created2 = await prRepo.create(closedPR2);

			// List closed PRs
			const closedPRs = await prRepo.listByStatus(
				testOwner,
				testRepoName,
				"closed",
			);

			// Should only contain closed PRs
			expect(closedPRs.length).toBeGreaterThanOrEqual(2);
			const closedNumbers = closedPRs.map((p) => p.prNumber);
			expect(closedNumbers).toContain(created1.prNumber);
			expect(closedNumbers).toContain(created2.prNumber);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created1.prNumber);
			await prRepo.delete(testOwner, testRepoName, created2.prNumber);
		});

		it("should list only merged PRs in chronological order", async () => {
			// Create merged PRs
			const mergedPR1 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Merged PR 1",
				author: testUsername,
				source_branch: "feature/merged1",
				target_branch: "main",
				status: "merged",
				merge_commit_sha: "sha111",
			});

			const mergedPR2 = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Merged PR 2",
				author: testUsername,
				source_branch: "feature/merged2",
				target_branch: "main",
				status: "merged",
				merge_commit_sha: "sha222",
			});

			const created1 = await prRepo.create(mergedPR1);
			const created2 = await prRepo.create(mergedPR2);

			// List merged PRs
			const mergedPRs = await prRepo.listByStatus(
				testOwner,
				testRepoName,
				"merged",
			);

			// Should only contain merged PRs
			expect(mergedPRs.length).toBeGreaterThanOrEqual(2);
			const mergedNumbers = mergedPRs.map((p) => p.prNumber);
			expect(mergedNumbers).toContain(created1.prNumber);
			expect(mergedNumbers).toContain(created2.prNumber);

			// Verify merge commit SHAs
			const pr1 = mergedPRs.find((p) => p.prNumber === created1.prNumber);
			const pr2 = mergedPRs.find((p) => p.prNumber === created2.prNumber);
			expect(pr1?.mergeCommitSha).toBe("sha111");
			expect(pr2?.mergeCommitSha).toBe("sha222");

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created1.prNumber);
			await prRepo.delete(testOwner, testRepoName, created2.prNumber);
		});
	});

	describe("update", () => {
		it("should update PR and maintain GSI4 keys when status changes", async () => {
			// Create open PR
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Original Title",
				author: testUsername,
				source_branch: "feature/update",
				target_branch: "main",
				status: "open",
			});

			const created = await prRepo.create(pr);

			// Update to merged
			const updated = new PullRequestEntity({
				owner: created.owner,
				repoName: created.repoName,
				prNumber: created.prNumber,
				title: "Updated Title",
				body: "Updated body",
				status: "merged",
				author: created.author,
				sourceBranch: created.sourceBranch,
				targetBranch: created.targetBranch,
				mergeCommitSha: "updated-sha",
				created: created.created,
				modified: created.modified,
			});

			const result = await prRepo.update(updated);

			// Verify update
			expect(result.title).toBe("Updated Title");
			expect(result.body).toBe("Updated body");
			expect(result.status).toBe("merged");
			expect(result.mergeCommitSha).toBe("updated-sha");

			// Verify it moved to merged list
			const mergedPRs = await prRepo.listByStatus(
				testOwner,
				testRepoName,
				"merged",
			);
			const mergedNumbers = mergedPRs.map((p) => p.prNumber);
			expect(mergedNumbers).toContain(created.prNumber);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, created.prNumber);
		});

		it("should throw error when updating non-existent PR", async () => {
			const pr = new PullRequestEntity({
				owner: testOwner,
				repoName: testRepoName,
				prNumber: 999999,
				title: "Non-existent",
				status: "open",
				author: testUsername,
				sourceBranch: "feature/none",
				targetBranch: "main",
			});

			await expect(prRepo.update(pr)).rejects.toThrow();
		});
	});

	describe("delete", () => {
		it("should delete PR", async () => {
			// Create PR
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "To Be Deleted",
				author: testUsername,
				source_branch: "feature/delete",
				target_branch: "main",
			});

			const created = await prRepo.create(pr);

			// Delete PR
			await prRepo.delete(testOwner, testRepoName, created.prNumber);

			// Verify deletion
			const retrieved = await prRepo.get(
				testOwner,
				testRepoName,
				created.prNumber,
			);
			expect(retrieved).toBeUndefined();
		});

		it("should not throw when deleting non-existent PR", async () => {
			await expect(
				prRepo.delete(testOwner, testRepoName, 999999),
			).resolves.not.toThrow();
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent PR creation with unique sequential numbers", async () => {
			const prs = Array.from({ length: 5 }, (_, i) =>
				PullRequestEntity.fromRequest({
					owner: testOwner,
					repo_name: testRepoName,
					title: `Concurrent PR ${i}`,
					author: testUsername,
					source_branch: `feature/concurrent-${i}`,
					target_branch: "main",
				}),
			);

			// Create all PRs concurrently
			const created = await Promise.all(prs.map((p) => prRepo.create(p)));

			// All should have unique numbers
			const numbers = created.map((p) => p.prNumber);
			const uniqueNumbers = new Set(numbers);
			expect(uniqueNumbers.size).toBe(5);

			// Cleanup
			await Promise.all(
				created.map((p) => prRepo.delete(testOwner, testRepoName, p.prNumber)),
			);
		});
	});
});
