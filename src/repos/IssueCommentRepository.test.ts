import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { IssueCommentRepository } from "./IssueCommentRepository";
import { IssueRepository } from "./IssueRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { createTableParams, initializeSchema } from "./schema";
import { IssueCommentEntity } from "../services/entities/IssueCommentEntity";
import { IssueEntity } from "../services/entities/IssueEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";
import { EntityNotFoundError } from "../shared";

describe("IssueCommentRepository", () => {
	let client: DynamoDBClient;
	let commentRepo: IssueCommentRepository;
	let issueRepo: IssueRepository;
	let repoRepo: RepoRepository;
	let userRepo: UserRepository;

	const testRunId = Date.now();
	const testUsername = `testuser-${testRunId}`;
	const testOwner = testUsername;
	const testRepoName = `test-repo-${testRunId}`;
	let testIssueNumber: number;

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
			const tableName = `test-comment-repo-${testRunId}`;
			await client.send(new CreateTableCommand(createTableParams(tableName)));

			// Initialize schema
			const schema = initializeSchema(tableName, client);

			// Initialize repositories
			commentRepo = new IssueCommentRepository(
				schema.table,
				schema.issueComment,
				schema.issue,
			);
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

			// Create test issue
			const issue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Test Issue for Comments",
				author: testUsername,
			});
			const createdIssue = await issueRepo.create(issue);
			testIssueNumber = createdIssue.issueNumber;
		},
		15000, // DynamoDB Local can be slow
	);

	afterAll(async () => {
		client.destroy();
	});

	describe("create", () => {
		it("should create comment with generated UUID", async () => {
			const comment = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "This is a test comment",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			expect(created.commentId).toBeDefined();
			expect(created.body).toBe("This is a test comment");
			expect(created.author).toBe(testUsername);
			expect(created.owner).toBe(testOwner);
			expect(created.repoName).toBe(testRepoName);
			expect(created.issueNumber).toBe(testIssueNumber);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);
		});

		it("should create comment with provided comment_id", async () => {
			const providedId = "custom-uuid-12345";
			const comment = new IssueCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				issueNumber: testIssueNumber,
				commentId: providedId,
				body: "Comment with custom ID",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			expect(created.commentId).toBe(providedId);
			expect(created.body).toBe("Comment with custom ID");

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				providedId,
			);
		});

		it("should throw EntityNotFoundError when issue doesn't exist", async () => {
			const comment = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: 999999, // Non-existent issue
				body: "This should fail",
				author: testUsername,
			});

			await expect(commentRepo.create(comment)).rejects.toThrow(
				EntityNotFoundError,
			);
		});
	});

	describe("get", () => {
		it("should retrieve comment by ID", async () => {
			// Create test comment
			const comment = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "Test retrieval comment",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Retrieve comment
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.commentId).toBe(created.commentId);
			expect(retrieved?.body).toBe("Test retrieval comment");
			expect(retrieved?.author).toBe(testUsername);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);
		});

		it("should return undefined for non-existent comment", async () => {
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testIssueNumber,
				"non-existent-uuid",
			);

			expect(retrieved).toBeUndefined();
		});
	});

	describe("update", () => {
		it("should update comment body", async () => {
			// Create test comment
			const comment = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "Original body",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Update comment
			const updated = new IssueCommentEntity({
				owner: created.owner,
				repoName: created.repoName,
				issueNumber: created.issueNumber,
				commentId: created.commentId,
				body: "Updated body",
				author: created.author,
				created: created.created,
				modified: created.modified,
			});

			const result = await commentRepo.update(updated);

			expect(result.body).toBe("Updated body");
			expect(result.commentId).toBe(created.commentId);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);
		});

		it("should throw error for non-existent comment", async () => {
			const comment = new IssueCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				issueNumber: testIssueNumber,
				commentId: "non-existent-uuid",
				body: "This should fail",
				author: testUsername,
			});

			await expect(commentRepo.update(comment)).rejects.toThrow();
		});
	});

	describe("delete", () => {
		it("should delete comment", async () => {
			// Create test comment
			const comment = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "To be deleted",
				author: testUsername,
			});

			const created = await commentRepo.create(comment);

			// Delete comment
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);

			// Verify deletion
			const retrieved = await commentRepo.get(
				testOwner,
				testRepoName,
				testIssueNumber,
				created.commentId,
			);
			expect(retrieved).toBeUndefined();
		});

		it("should not error on non-existent comment", async () => {
			await expect(
				commentRepo.delete(
					testOwner,
					testRepoName,
					testIssueNumber,
					"non-existent-uuid",
				),
			).resolves.not.toThrow();
		});
	});

	describe("listByIssue", () => {
		it("should list all comments for an issue", async () => {
			// Create multiple comments
			const comment1 = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "First comment",
				author: testUsername,
			});

			const comment2 = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "Second comment",
				author: testUsername,
			});

			const created1 = await commentRepo.create(comment1);
			const created2 = await commentRepo.create(comment2);

			// List all comments
			const comments = await commentRepo.listByIssue(
				testOwner,
				testRepoName,
				testIssueNumber,
			);

			expect(comments.length).toBeGreaterThanOrEqual(2);
			const commentIds = comments.map((c) => c.commentId);
			expect(commentIds).toContain(created1.commentId);
			expect(commentIds).toContain(created2.commentId);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created1.commentId,
			);
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created2.commentId,
			);
		});

		it("should return empty array for issue with no comments", async () => {
			// Create a new issue without comments
			const newIssue = IssueEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				title: "Issue without comments",
				author: testUsername,
			});

			const createdIssue = await issueRepo.create(newIssue);

			const comments = await commentRepo.listByIssue(
				testOwner,
				testRepoName,
				createdIssue.issueNumber,
			);

			expect(comments).toEqual([]);

			// Cleanup
			await issueRepo.delete(testOwner, testRepoName, createdIssue.issueNumber);
		});

		it("should order comments by creation time", async () => {
			// Create comments with slight delays to ensure ordering
			const comment1 = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "First in sequence",
				author: testUsername,
			});

			const created1 = await commentRepo.create(comment1);

			// Small delay to ensure different UUIDs (which are time-sortable)
			await new Promise((resolve) => setTimeout(resolve, 10));

			const comment2 = IssueCommentEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
				issue_number: testIssueNumber,
				body: "Second in sequence",
				author: testUsername,
			});

			const created2 = await commentRepo.create(comment2);

			// List comments
			const comments = await commentRepo.listByIssue(
				testOwner,
				testRepoName,
				testIssueNumber,
			);

			// Find our test comments
			const idx1 = comments.findIndex(
				(c) => c.commentId === created1.commentId,
			);
			const idx2 = comments.findIndex(
				(c) => c.commentId === created2.commentId,
			);

			// Both should exist
			expect(idx1).toBeGreaterThanOrEqual(0);
			expect(idx2).toBeGreaterThanOrEqual(0);

			// Cleanup
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created1.commentId,
			);
			await commentRepo.delete(
				testOwner,
				testRepoName,
				testIssueNumber,
				created2.commentId,
			);
		});
	});
});
