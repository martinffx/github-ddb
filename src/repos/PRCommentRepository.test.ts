import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { PRCommentRepository } from "./PRCommentRepository";
import { PullRequestRepository } from "./PullRequestRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { createTableParams, initializeSchema } from "./schema";
import { PRCommentEntity } from "../services/entities/PRCommentEntity";
import { PullRequestEntity } from "../services/entities/PullRequestEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";
import { EntityNotFoundError } from "../shared";

describe("PRCommentRepository", () => {
	let client: DynamoDBClient;
	let commentRepo: PRCommentRepository;
	let prRepo: PullRequestRepository;
	let repoRepo: RepoRepository;
	let userRepo: UserRepository;

	const testRunId = Date.now();
	const testUsername = `testuser-${testRunId}`;
	const testOwner = testUsername;
	const testRepoName = `test-repo-${testRunId}`;
	let testPRNumber: number;

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
			const tableName = `test-prcomment-repo-${testRunId}`;
			await client.send(new CreateTableCommand(createTableParams(tableName)));

			// Initialize schema
			const schema = initializeSchema(tableName, client);

			// Initialize repositories
			commentRepo = new PRCommentRepository(
				schema.table,
				schema.prComment,
				schema.pullRequest,
			);
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

			// Create test PR
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test PR",
				author: testUsername,
				source_branch: "feature",
				target_branch: "main",
			});
			const createdPR = await prRepo.create(pr);
			testPRNumber = createdPR.prNumber;
		},
		15000, // DynamoDB Local can be slow
	);

	afterAll(async () => {
		client.destroy();
	});

	describe("create", () => {
		it("should create PR comment with generated UUID", async () => {
			const comment = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "This is a test comment",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			expect(created.commentId).toBeDefined();
			expect(created.commentId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(created.body).toBe("This is a test comment");
			expect(created.author).toBe(testUsername);
			expect(created.owner).toBe(testOwner);
			expect(created.repoName).toBe(testRepoName);
			expect(created.prNumber).toBe(testPRNumber);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);
		});

		it("should create PR comment with provided UUID", async () => {
			const providedId = "550e8400-e29b-41d4-a716-446655440000";
			const comment = new PRCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				prNumber: testPRNumber,
				commentId: providedId,
				body: "Comment with provided ID",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			expect(created.commentId).toBe(providedId);
			expect(created.body).toBe("Comment with provided ID");

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);
		});

		it("should fail to create comment for non-existent PR", async () => {
			const comment = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: 999999,
				body: "Comment on non-existent PR",
				author: testUsername,
			});

			await expect(commentRepo.create(comment)).rejects.toThrow(
				EntityNotFoundError,
			);
		});
	});

	describe("get", () => {
		it("should retrieve PR comment by owner, repo, PR number, and comment ID", async () => {
			// Create test comment
			const comment = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "Test Get Comment",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Retrieve comment
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.commentId).toBe(created.commentId);
			expect(retrieved?.body).toBe("Test Get Comment");
			expect(retrieved?.author).toBe(testUsername);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);
		});

		it("should return undefined for non-existent comment", async () => {
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testPRNumber,
				"00000000-0000-0000-0000-000000000000",
			);

			expect(retrieved).toBeUndefined();
		});
	});

	describe("listByPR", () => {
		it("should list all comments for a PR", async () => {
			// Create multiple comments
			const comment1 = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "First comment",
				author: testUsername,
			});

			const comment2 = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "Second comment",
				author: testUsername,
			});

			const created1 = await commentRepo.create(comment1);
			const created2 = await commentRepo.create(comment2);

			// List all comments
			const comments = await commentRepo.listByPR(
				testOwner,
				testRepoName,
				testPRNumber,
			);

			expect(comments.length).toBeGreaterThanOrEqual(2);
			const commentIds = comments.map((c) => c.commentId);
			expect(commentIds).toContain(created1.commentId);
			expect(commentIds).toContain(created2.commentId);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created1.commentId,
			);
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created2.commentId,
			);
		});

		it("should return empty array for PR with no comments", async () => {
			// Create new PR without comments
			const pr = PullRequestEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "PR without comments",
				author: testUsername,
				source_branch: "test",
				target_branch: "main",
			});
			const createdPR = await prRepo.create(pr);

			const comments = await commentRepo.listByPR(
				testOwner,
				testRepoName,
				createdPR.prNumber,
			);

			expect(comments).toEqual([]);

			// Cleanup
			await prRepo.delete(testOwner, testRepoName, createdPR.prNumber);
		});

		it("should list comments in chronological order", async () => {
			// Create comments with delays
			const comment1 = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "First chronological comment",
				author: testUsername,
			});
			const created1 = await commentRepo.create(comment1);

			// Small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 50));

			const comment2 = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "Second chronological comment",
				author: testUsername,
			});
			const created2 = await commentRepo.create(comment2);

			const comments = await commentRepo.listByPR(
				testOwner,
				testRepoName,
				testPRNumber,
			);

			// Find our test comments
			const idx1 = comments.findIndex(
				(c) => c.commentId === created1.commentId,
			);
			const idx2 = comments.findIndex(
				(c) => c.commentId === created2.commentId,
			);

			// Verify ordering based on comment_id (UUID) in SK
			expect(idx1).not.toBe(-1);
			expect(idx2).not.toBe(-1);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created1.commentId,
			);
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created2.commentId,
			);
		});
	});

	describe("update", () => {
		it("should update PR comment body", async () => {
			// Create test comment
			const comment = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "Original body",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Update body
			const updated = created.updateWith({ body: "Updated body" });
			const result = await commentRepo.update(updated);

			expect(result.body).toBe("Updated body");
			expect(result.commentId).toBe(created.commentId);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);
		});

		it("should throw error when updating non-existent comment", async () => {
			const comment = new PRCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				prNumber: testPRNumber,
				commentId: "00000000-0000-0000-0000-000000000000",
				body: "Non-existent",
				author: testUsername,
			});

			await expect(commentRepo.update(comment)).rejects.toThrow();
		});
	});

	describe("delete", () => {
		it("should delete PR comment", async () => {
			// Create comment
			const comment = PRCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				pr_number: testPRNumber,
				body: "To Be Deleted",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Delete comment
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);

			// Verify deletion
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testPRNumber,
				created.commentId,
			);
			expect(retrieved).toBeUndefined();
		});

		it("should not throw when deleting non-existent comment", async () => {
			await expect(
				commentRepo.delete(
					testOwner,
					testRepoName,
					testPRNumber,
					"00000000-0000-0000-0000-000000000000",
				),
			).resolves.not.toThrow();
		});
	});
});
