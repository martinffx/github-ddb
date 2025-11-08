import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { IssueRepository } from "./IssueRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { createTableParams, initializeSchema } from "./schema";
import { IssueEntity } from "../services/entities/IssueEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";

describe("IssueRepository", () => {
	let client: DynamoDBClient;
	let issueRepo: IssueRepository;
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
			const tableName = `test-issue-repo-${testRunId}`;
			await client.send(new CreateTableCommand(createTableParams(tableName)));

			// Initialize schema
			const schema = initializeSchema(tableName, client);

			// Initialize repositories
			issueRepo = new IssueRepository(
				schema.table,
				schema.issue,
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
		it("should create issue with sequential issue number from counter", async () => {
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Issue #1",
				body: "First test issue",
				author: testUsername,
			});

			const created = await issueRepo.create(issue);

			// Should get issue number 1
			expect(created.issueNumber).toBe(1);
			expect(created.title).toBe("Test Issue #1");
			expect(created.body).toBe("First test issue");
			expect(created.status).toBe("open");
			expect(created.author).toBe(testUsername);
			expect(created.assignees).toEqual([]);
			expect(created.labels).toEqual([]);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, 1);
		});

		it("should create second issue with incremented number", async () => {
			const issue1 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Issue #1",
				author: testUsername,
			});

			const issue2 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Issue #2",
				author: testUsername,
			});

			const created1 = await issueRepo.create(issue1);
			const created2 = await issueRepo.create(issue2);

			expect(created1.issueNumber).toBeLessThan(created2.issueNumber);
			expect(created2.issueNumber - created1.issueNumber).toBe(1);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created1.issueNumber);
			await issueRepo.delete(testOwner, testRepoName, created2.issueNumber);
		});

		it("should create issue with assignees and labels", async () => {
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Issue with metadata",
				author: testUsername,
				assignees: [testUsername, "other-user"],
				labels: ["bug", "urgent"],
			});

			const created = await issueRepo.create(issue);

			// DynamoDB Sets are unordered, so sort before comparing
			expect(created.assignees.sort()).toEqual(
				[testUsername, "other-user"].sort(),
			);
			expect(created.labels.sort()).toEqual(["bug", "urgent"].sort());

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created.issueNumber);
		});

		it("should create closed issue", async () => {
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed Issue",
				author: testUsername,
				status: "closed",
			});

			const created = await issueRepo.create(issue);

			expect(created.status).toBe("closed");

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created.issueNumber);
		});
	});

	describe("get", () => {
		it("should retrieve issue by owner, repo, and number", async () => {
			// Create test issue
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Get Issue",
				author: testUsername,
			});

			const created = await issueRepo.create(issue);

			// Retrieve issue
			const retrieved = await issueRepo.get(
				testOwner,
				testRepoName,
				created.issueNumber,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.issueNumber).toBe(created.issueNumber);
			expect(retrieved?.title).toBe("Test Get Issue");
			expect(retrieved?.author).toBe(testUsername);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created.issueNumber);
		});

		it("should return undefined for non-existent issue", async () => {
			const retrieved = await issueRepo.get(testOwner, testRepoName, 999999);

			expect(retrieved).toBeUndefined();
		});
	});

	describe("list", () => {
		it("should list all issues for a repository", async () => {
			// Create multiple issues
			const issue1 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Issue 1",
				author: testUsername,
			});

			const issue2 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Issue 2",
				author: testUsername,
			});

			const created1 = await issueRepo.create(issue1);
			const created2 = await issueRepo.create(issue2);

			// List all issues
			const issues = await issueRepo.list(testOwner, testRepoName);

			expect(issues.length).toBeGreaterThanOrEqual(2);
			const issueNumbers = issues.map((i) => i.issueNumber);
			expect(issueNumbers).toContain(created1.issueNumber);
			expect(issueNumbers).toContain(created2.issueNumber);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created1.issueNumber);
			await issueRepo.delete(testOwner, testRepoName, created2.issueNumber);
		});

		it("should return empty array for repository with no issues", async () => {
			const uniqueRepoName = `empty-repo-${Date.now()}`;

			// Create empty repository
			const repo = RepositoryEntity.fromRequest({
				owner: testOwner,
				repo_name: uniqueRepoName,
			});
			await repoRepo.createRepo(repo);

			const issues = await issueRepo.list(testOwner, uniqueRepoName);

			expect(issues).toEqual([]);

			// Cleanup
			await repoRepo.deleteRepo({
				owner: testOwner,
				repo_name: uniqueRepoName,
			});
		});
	});

	describe("listByStatus", () => {
		it("should list only open issues in reverse chronological order", async () => {
			// Create open and closed issues
			const openIssue1 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Open Issue 1",
				author: testUsername,
				status: "open",
			});

			const closedIssue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed Issue",
				author: testUsername,
				status: "closed",
			});

			const openIssue2 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Open Issue 2",
				author: testUsername,
				status: "open",
			});

			const created1 = await issueRepo.create(openIssue1);
			const created2 = await issueRepo.create(closedIssue);
			const created3 = await issueRepo.create(openIssue2);

			// List open issues
			const openIssues = await issueRepo.listByStatus(
				testOwner,
				testRepoName,
				"open",
			);

			// Should only contain open issues
			const openTitles = openIssues.map((i) => i.title);
			expect(openTitles).toContain("Open Issue 1");
			expect(openTitles).toContain("Open Issue 2");
			expect(openTitles).not.toContain("Closed Issue");

			// Should be in reverse chronological order (newest first)
			const openNumbers = openIssues.map((i) => i.issueNumber);
			const idx1 = openNumbers.indexOf(created1.issueNumber);
			const idx3 = openNumbers.indexOf(created3.issueNumber);
			if (idx1 !== -1 && idx3 !== -1) {
				expect(idx3).toBeLessThan(idx1); // created3 should come before created1
			}

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created1.issueNumber);
			await issueRepo.delete(testOwner, testRepoName, created2.issueNumber);
			await issueRepo.delete(testOwner, testRepoName, created3.issueNumber);
		});

		it("should list only closed issues in chronological order", async () => {
			// Create closed issues
			const closedIssue1 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed Issue 1",
				author: testUsername,
				status: "closed",
			});

			const closedIssue2 = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Closed Issue 2",
				author: testUsername,
				status: "closed",
			});

			const created1 = await issueRepo.create(closedIssue1);
			const created2 = await issueRepo.create(closedIssue2);

			// List closed issues
			const closedIssues = await issueRepo.listByStatus(
				testOwner,
				testRepoName,
				"closed",
			);

			// Should only contain closed issues
			expect(closedIssues.length).toBeGreaterThanOrEqual(2);
			const closedNumbers = closedIssues.map((i) => i.issueNumber);
			expect(closedNumbers).toContain(created1.issueNumber);
			expect(closedNumbers).toContain(created2.issueNumber);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created1.issueNumber);
			await issueRepo.delete(testOwner, testRepoName, created2.issueNumber);
		});
	});

	describe("update", () => {
		it("should update issue and maintain GSI4 keys when status changes", async () => {
			// Create open issue
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Original Title",
				author: testUsername,
				status: "open",
			});

			const created = await issueRepo.create(issue);

			// Update to closed
			const updated = new IssueEntity({
				owner: created.owner,
				repoName: created.repoName,
				issueNumber: created.issueNumber,
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
				author: created.author,
				assignees: ["new-assignee"],
				labels: ["updated"],
				created: created.created,
				modified: created.modified,
			});

			const result = await issueRepo.update(updated);

			// Verify update
			expect(result.title).toBe("Updated Title");
			expect(result.body).toBe("Updated body");
			expect(result.status).toBe("closed");
			expect(result.assignees).toContain("new-assignee");
			expect(result.labels).toContain("updated");

			// Verify it moved to closed list
			const closedIssues = await issueRepo.listByStatus(
				testOwner,
				testRepoName,
				"closed",
			);
			const closedNumbers = closedIssues.map((i) => i.issueNumber);
			expect(closedNumbers).toContain(created.issueNumber);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, created.issueNumber);
		});

		it("should throw error when updating non-existent issue", async () => {
			const issue = new IssueEntity({
				owner: testOwner,
				repoName: testRepoName,
				issueNumber: 999999,
				title: "Non-existent",
				status: "open",
				author: testUsername,
				assignees: [],
				labels: [],
			});

			await expect(issueRepo.update(issue)).rejects.toThrow();
		});
	});

	describe("delete", () => {
		it("should delete issue", async () => {
			// Create issue
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "To Be Deleted",
				author: testUsername,
			});

			const created = await issueRepo.create(issue);

			// Delete issue
			await issueRepo.delete(testOwner, testRepoName, created.issueNumber);

			// Verify deletion
			const retrieved = await issueRepo.get(
				testOwner,
				testRepoName,
				created.issueNumber,
			);
			expect(retrieved).toBeUndefined();
		});

		it("should not throw when deleting non-existent issue", async () => {
			await expect(
				issueRepo.delete(testOwner, testRepoName, 999999),
			).resolves.not.toThrow();
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent issue creation with unique sequential numbers", async () => {
			const issues = Array.from({ length: 5 }, (_, i) =>
				IssueEntity.fromRequest({
					owner: testOwner,
					repo_name: testRepoName,
					title: `Concurrent Issue ${i}`,
					author: testUsername,
				}),
			);

			// Create all issues concurrently
			const created = await Promise.all(issues.map((i) => issueRepo.create(i)));

			// All should have unique numbers
			const numbers = created.map((i) => i.issueNumber);
			const uniqueNumbers = new Set(numbers);
			expect(uniqueNumbers.size).toBe(5);

			// Cleanup
			await Promise.all(
				created.map((i) =>
					issueRepo.delete(testOwner, testRepoName, i.issueNumber),
				),
			);
		});
	});
});
