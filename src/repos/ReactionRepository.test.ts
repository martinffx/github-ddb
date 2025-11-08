import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import {
	createTableParams,
	initializeSchema,
	type GithubSchema,
} from "./schema";
import { ReactionRepository } from "./ReactionRepository";
import { ReactionEntity } from "../services/entities/ReactionEntity";
import { IssueEntity } from "../services/entities/IssueEntity";
import { PullRequestEntity } from "../services/entities/PullRequestEntity";
import { IssueCommentEntity } from "../services/entities/IssueCommentEntity";
import { PRCommentEntity } from "../services/entities/PRCommentEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { UserEntity } from "../services/entities/UserEntity";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { IssueRepository } from "./IssueRepository";
import { PullRequestRepository } from "./PullRequestRepository";
import { IssueCommentRepository } from "./IssueCommentRepository";
import { PRCommentRepository } from "./PRCommentRepository";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";

describe("ReactionRepository", () => {
	let client: DynamoDBClient;
	let schema: GithubSchema;
	let reactionRepo: ReactionRepository;
	let repoRepo: RepoRepository;
	let userRepo: UserRepository;
	let issueRepo: IssueRepository;
	let prRepo: PullRequestRepository;
	let issueCommentRepo: IssueCommentRepository;
	let prCommentRepo: PRCommentRepository;

	const testRunId = Date.now();
	const owner = `testowner-${testRunId}`;
	const repoName = `testrepo-${testRunId}`;

	beforeAll(async () => {
		// Initialize DynamoDB client
		client = new DynamoDBClient({
			endpoint: "http://localhost:8000",
			region: "local",
			credentials: {
				accessKeyId: "dummy",
				secretAccessKey: "dummy",
			},
		});

		// Create table
		const tableName = `test-reactions-${testRunId}`;
		await client.send(new CreateTableCommand(createTableParams(tableName)));

		// Initialize schema
		schema = initializeSchema(tableName, client);

		// Initialize repositories
		reactionRepo = new ReactionRepository(
			schema.table,
			schema.reaction,
			schema.issue,
			schema.pullRequest,
			schema.issueComment,
			schema.prComment,
		);

		repoRepo = new RepoRepository(
			schema.table,
			schema.repository,
			schema.user,
			schema.organization,
		);

		userRepo = new UserRepository(schema.user);

		issueRepo = new IssueRepository(
			schema.table,
			schema.issue,
			schema.counter,
			schema.repository,
		);

		prRepo = new PullRequestRepository(
			schema.table,
			schema.pullRequest,
			schema.counter,
			schema.repository,
		);

		issueCommentRepo = new IssueCommentRepository(
			schema.table,
			schema.issueComment,
			schema.issue,
		);

		prCommentRepo = new PRCommentRepository(
			schema.table,
			schema.prComment,
			schema.pullRequest,
		);

		// Create test user (owner) first
		const user = UserEntity.fromRequest({
			username: owner,
			email: `${owner}@example.com`,
		});
		await userRepo.createUser(user);

		// Create test repository
		const repo = new RepositoryEntity({
			owner,
			repoName,
			description: "Test repo for reactions",
		});
		await repoRepo.createRepo(repo);
	}, 15000);

	afterAll(async () => {
		if (client) {
			client.destroy();
		}
	});

	describe("create and get reactions", () => {
		it("should create reaction on an issue", async () => {
			// Create issue first
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 1,
				title: "Test Issue for Reaction",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create reaction
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});

			const created = await reactionRepo.create(reaction);

			expect(created.owner).toBe(owner);
			expect(created.repoName).toBe(repoName);
			expect(created.targetType).toBe("ISSUE");
			expect(created.targetId).toBe(String(createdIssue.issueNumber));
			expect(created.user).toBe("testuser");
			expect(created.emoji).toBe("👍");
			expect(created.created).toBeDefined();

			// Verify we can retrieve it
			const retrieved = await reactionRepo.get(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.emoji).toBe("👍");

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});

		it("should create reaction on a PR", async () => {
			// Create PR first
			const pr = new PullRequestEntity({
				owner,
				repoName,
				prNumber: 1,
				title: "Test PR for Reaction",
				body: "Test body",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});
			const createdPR = await prRepo.create(pr);

			// Create reaction
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "PR",
				targetId: String(createdPR.prNumber),
				user: "testuser",
				emoji: "🎉",
			});

			const created = await reactionRepo.create(reaction);

			expect(created.targetType).toBe("PR");
			expect(created.targetId).toBe(String(createdPR.prNumber));
			expect(created.emoji).toBe("🎉");

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"PR",
				String(createdPR.prNumber),
				"testuser",
				"🎉",
			);
			await prRepo.delete(owner, repoName, createdPR.prNumber);
		});

		it("should create reaction on an issue comment", async () => {
			const testId = Date.now();
			const testOwner = `owner-${testId}`;
			const testRepoName = `repo-${testId}`;

			// Create user
			const user = UserEntity.fromRequest({
				username: testOwner,
				email: `${testOwner}@test.com`,
			});
			await userRepo.createUser(user);

			// Create repository
			const repo = RepositoryEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
			});
			await repoRepo.createRepo(repo);

			// Create issue and comment first
			const issue = new IssueEntity({
				owner: testOwner,
				repoName: testRepoName,
				issueNumber: 0,
				title: "Test Issue for Comment Reaction",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			const comment = new IssueCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				issueNumber: createdIssue.issueNumber,
				body: "Test comment",
				author: "testuser",
			});
			const createdComment = await issueCommentRepo.create(comment);

			// Create reaction
			const targetId = `${createdIssue.issueNumber}-${createdComment.commentId}`;
			const reaction = new ReactionEntity({
				owner: testOwner,
				repoName: testRepoName,
				targetType: "ISSUECOMMENT",
				targetId,
				user: "testuser",
				emoji: "❤️",
			});

			const created = await reactionRepo.create(reaction);

			expect(created.targetType).toBe("ISSUECOMMENT");
			expect(created.targetId).toBe(targetId);
			expect(created.emoji).toBe("❤️");

			// Cleanup
			await reactionRepo.delete(
				testOwner,
				testRepoName,
				"ISSUECOMMENT",
				targetId,
				"testuser",
				"❤️",
			);
			await issueCommentRepo.delete(
				testOwner,
				testRepoName,
				createdIssue.issueNumber,
				createdComment.commentId,
			);
			await issueRepo.delete(testOwner, testRepoName, createdIssue.issueNumber);
			await repoRepo.deleteRepo({ owner: testOwner, repo_name: testRepoName });
			await userRepo.deleteUser(testOwner);
		});

		it("should create reaction on a PR comment", async () => {
			const testId = Date.now();
			const testOwner = `owner-${testId}`;
			const testRepoName = `repo-${testId}`;

			// Create user
			const user = UserEntity.fromRequest({
				username: testOwner,
				email: `${testOwner}@test.com`,
			});
			await userRepo.createUser(user);

			// Create repository
			const repo = RepositoryEntity.fromRequest({
				owner: testOwner,
				repo_name: testRepoName,
			});
			await repoRepo.createRepo(repo);

			// Create PR and comment first
			const pr = new PullRequestEntity({
				owner: testOwner,
				repoName: testRepoName,
				prNumber: 0,
				title: "Test PR for Comment Reaction",
				body: "Test body",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});
			const createdPR = await prRepo.create(pr);

			const comment = new PRCommentEntity({
				owner: testOwner,
				repoName: testRepoName,
				prNumber: createdPR.prNumber,
				body: "Test comment",
				author: "testuser",
			});
			const createdComment = await prCommentRepo.create(comment);

			// Create reaction
			const targetId = `${createdPR.prNumber}-${createdComment.commentId}`;
			const reaction = new ReactionEntity({
				owner: testOwner,
				repoName: testRepoName,
				targetType: "PRCOMMENT",
				targetId,
				user: "testuser",
				emoji: "🚀",
			});

			const created = await reactionRepo.create(reaction);

			expect(created.targetType).toBe("PRCOMMENT");
			expect(created.targetId).toBe(targetId);
			expect(created.emoji).toBe("🚀");

			// Cleanup
			await reactionRepo.delete(
				testOwner,
				testRepoName,
				"PRCOMMENT",
				targetId,
				"testuser",
				"🚀",
			);
			await prCommentRepo.delete(
				testOwner,
				testRepoName,
				createdPR.prNumber,
				createdComment.commentId,
			);
			await prRepo.delete(testOwner, testRepoName, createdPR.prNumber);
			await repoRepo.deleteRepo({ owner: testOwner, repo_name: testRepoName });
			await userRepo.deleteUser(testOwner);
		});
	});

	describe("uniqueness constraints", () => {
		it("should fail to create duplicate reaction (same user+emoji+target)", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 2,
				title: "Test Issue for Duplicate",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create first reaction
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});
			await reactionRepo.create(reaction1);

			// Try to create duplicate
			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});

			await expect(reactionRepo.create(reaction2)).rejects.toThrow(
				DuplicateEntityError,
			);

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});

		it("should allow multiple emojis by same user on same target", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 3,
				title: "Test Issue for Multiple Emojis",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create first reaction
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});
			await reactionRepo.create(reaction1);

			// Create second reaction with different emoji
			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "❤️",
			});
			const created2 = await reactionRepo.create(reaction2);

			expect(created2.emoji).toBe("❤️");

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"❤️",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});

		it("should allow same emoji by different users on same target", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 4,
				title: "Test Issue for Multiple Users",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create first reaction
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "user1",
				emoji: "👍",
			});
			await reactionRepo.create(reaction1);

			// Create second reaction with different user
			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "user2",
				emoji: "👍",
			});
			const created2 = await reactionRepo.create(reaction2);

			expect(created2.user).toBe("user2");

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"user1",
				"👍",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"user2",
				"👍",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});
	});

	describe("transaction failure when target doesn't exist", () => {
		it("should fail to create reaction when issue doesn't exist", async () => {
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: "999999",
				user: "testuser",
				emoji: "👍",
			});

			await expect(reactionRepo.create(reaction)).rejects.toThrow(
				EntityNotFoundError,
			);
		});

		it("should fail to create reaction when PR doesn't exist", async () => {
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "PR",
				targetId: "999999",
				user: "testuser",
				emoji: "👍",
			});

			await expect(reactionRepo.create(reaction)).rejects.toThrow(
				EntityNotFoundError,
			);
		});

		it("should fail to create reaction when issue comment doesn't exist", async () => {
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUECOMMENT",
				targetId: "999999-nonexistent",
				user: "testuser",
				emoji: "👍",
			});

			await expect(reactionRepo.create(reaction)).rejects.toThrow(
				EntityNotFoundError,
			);
		});

		it("should fail to create reaction when PR comment doesn't exist", async () => {
			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "PRCOMMENT",
				targetId: "999999-nonexistent",
				user: "testuser",
				emoji: "👍",
			});

			await expect(reactionRepo.create(reaction)).rejects.toThrow(
				EntityNotFoundError,
			);
		});
	});

	describe("delete reactions", () => {
		it("should delete a reaction", async () => {
			// Create issue and reaction
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 5,
				title: "Test Issue for Delete",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			const reaction = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});
			await reactionRepo.create(reaction);

			// Delete reaction
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);

			// Verify it's deleted
			const retrieved = await reactionRepo.get(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);

			expect(retrieved).toBeUndefined();

			// Cleanup
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});
	});

	describe("list reactions", () => {
		it("should list all reactions for a target", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 6,
				title: "Test Issue for List",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create multiple reactions
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "user1",
				emoji: "👍",
			});
			await reactionRepo.create(reaction1);

			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "user2",
				emoji: "❤️",
			});
			await reactionRepo.create(reaction2);

			const reaction3 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "user3",
				emoji: "🎉",
			});
			await reactionRepo.create(reaction3);

			// List reactions
			const reactions = await reactionRepo.listByTarget(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
			);

			expect(reactions).toHaveLength(3);
			expect(reactions.map((r) => r.emoji)).toContain("👍");
			expect(reactions.map((r) => r.emoji)).toContain("❤️");
			expect(reactions.map((r) => r.emoji)).toContain("🎉");

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"user1",
				"👍",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"user2",
				"❤️",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"user3",
				"🎉",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});

		it("should list reactions by user and target", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 7,
				title: "Test Issue for User List",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Create multiple reactions by same user
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});
			await reactionRepo.create(reaction1);

			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "❤️",
			});
			await reactionRepo.create(reaction2);

			// Create reaction by different user
			const reaction3 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "otheruser",
				emoji: "🎉",
			});
			await reactionRepo.create(reaction3);

			// List reactions by testuser
			const reactions = await reactionRepo.getByUserAndTarget(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
			);

			expect(reactions).toHaveLength(2);
			expect(reactions.map((r) => r.emoji)).toContain("👍");
			expect(reactions.map((r) => r.emoji)).toContain("❤️");
			expect(reactions.every((r) => r.user === "testuser")).toBe(true);

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"❤️",
			);
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"otheruser",
				"🎉",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent reaction creation atomically", async () => {
			// Create issue
			const issue = new IssueEntity({
				owner,
				repoName,
				issueNumber: 8,
				title: "Test Issue for Concurrent",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});
			const createdIssue = await issueRepo.create(issue);

			// Try to create same reaction concurrently
			const reaction1 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});

			const reaction2 = new ReactionEntity({
				owner,
				repoName,
				targetType: "ISSUE",
				targetId: String(createdIssue.issueNumber),
				user: "testuser",
				emoji: "👍",
			});

			// One should succeed, one should fail
			const results = await Promise.allSettled([
				reactionRepo.create(reaction1),
				reactionRepo.create(reaction2),
			]);

			const succeeded = results.filter((r) => r.status === "fulfilled");
			const failed = results.filter((r) => r.status === "rejected");

			expect(succeeded).toHaveLength(1);
			expect(failed).toHaveLength(1);

			// Cleanup
			await reactionRepo.delete(
				owner,
				repoName,
				"ISSUE",
				String(createdIssue.issueNumber),
				"testuser",
				"👍",
			);
			await issueRepo.delete(owner, repoName, createdIssue.issueNumber);
		});
	});
});
