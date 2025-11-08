import { PullRequestService } from "./PullRequestService";
import type {
	PullRequestRepository,
	PRCommentRepository,
	ReactionRepository,
} from "../repos";
import { PullRequestEntity, PRCommentEntity, ReactionEntity } from "./entities";
import { EntityNotFoundError, ValidationError } from "../shared";
import type {
	PullRequestCreateRequest,
	PullRequestUpdateRequest,
} from "../routes/schema";

describe("PullRequestService", () => {
	const mockPullRequestRepo = jest.mocked<PullRequestRepository>({
		create: jest.fn(),
		get: jest.fn(),
		list: jest.fn(),
		listByStatus: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as PullRequestRepository);

	const mockPRCommentRepo = jest.mocked<PRCommentRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByPR: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as PRCommentRepository);

	const mockReactionRepo = jest.mocked<ReactionRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByTarget: jest.fn(),
		delete: jest.fn(),
	} as unknown as ReactionRepository);

	const pullRequestService = new PullRequestService(
		mockPullRequestRepo,
		mockPRCommentRepo,
		mockReactionRepo,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createPullRequest", () => {
		it("should create a new pull request successfully", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				body: "Test PR body",
				status: "open",
				author: "testuser",
				source_branch: "feature-branch",
				target_branch: "main",
			};

			const mockEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: request.title,
				body: request.body,
				status: "open",
				author: request.author,
				sourceBranch: request.source_branch,
				targetBranch: request.target_branch,
			});

			mockPullRequestRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await pullRequestService.createPullRequest(
				"testowner",
				"testrepo",
				request,
			);

			// Assert
			expect(mockPullRequestRepo.create).toHaveBeenCalledTimes(1);
			expect(mockPullRequestRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					title: request.title,
					body: request.body,
					status: request.status,
					author: request.author,
					sourceBranch: request.source_branch,
					targetBranch: request.target_branch,
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.pr_number).toBe(1);
			expect(result.title).toBe(request.title);
		});

		it("should create PR with default status 'open' when not provided", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
			};

			const mockEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: request.title,
				status: "open",
				author: request.author,
				sourceBranch: request.source_branch,
				targetBranch: request.target_branch,
			});

			mockPullRequestRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await pullRequestService.createPullRequest(
				"testowner",
				"testrepo",
				request,
			);

			// Assert
			expect(result.status).toBe("open");
		});

		it("should throw ValidationError when repository does not exist", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
			};

			mockPullRequestRepo.create.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act & Assert
			await expect(
				pullRequestService.createPullRequest("testowner", "testrepo", request),
			).rejects.toThrow(ValidationError);
			await expect(
				pullRequestService.createPullRequest("testowner", "testrepo", request),
			).rejects.toThrow("does not exist");
		});

		it("should throw ValidationError for invalid PR data", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "", // Invalid: empty title
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
			};

			// Act & Assert - Entity.fromRequest will throw ValidationError
			await expect(
				pullRequestService.createPullRequest("testowner", "testrepo", request),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("getPullRequest", () => {
		it("should retrieve an existing pull request", async () => {
			// Arrange
			const mockEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: "Test PR",
				body: "Test body",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});

			mockPullRequestRepo.get.mockResolvedValue(mockEntity);

			// Act
			const result = await pullRequestService.getPullRequest(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(mockPullRequestRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.pr_number).toBe(1);
			expect(result.title).toBe("Test PR");
		});

		it("should throw EntityNotFoundError for non-existent PR", async () => {
			// Arrange
			mockPullRequestRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.getPullRequest("testowner", "testrepo", 999),
			).rejects.toThrow(EntityNotFoundError);
			await expect(
				pullRequestService.getPullRequest("testowner", "testrepo", 999),
			).rejects.toThrow("not found");
		});
	});

	describe("listPullRequests", () => {
		it("should list all PRs when no status filter provided", async () => {
			// Arrange
			const mockEntities = [
				new PullRequestEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					title: "PR 1",
					status: "open",
					author: "user1",
					sourceBranch: "feature1",
					targetBranch: "main",
				}),
				new PullRequestEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 2,
					title: "PR 2",
					status: "closed",
					author: "user2",
					sourceBranch: "feature2",
					targetBranch: "main",
				}),
			];

			mockPullRequestRepo.list.mockResolvedValue(mockEntities);

			// Act
			const result = await pullRequestService.listPullRequests(
				"testowner",
				"testrepo",
			);

			// Assert
			expect(mockPullRequestRepo.list).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
			);
			expect(result).toHaveLength(2);
			expect(result[0].pr_number).toBe(1);
			expect(result[1].pr_number).toBe(2);
		});

		it("should list only open PRs when status filter is 'open'", async () => {
			// Arrange
			const mockEntities = [
				new PullRequestEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					title: "PR 1",
					status: "open",
					author: "user1",
					sourceBranch: "feature1",
					targetBranch: "main",
				}),
			];

			mockPullRequestRepo.listByStatus.mockResolvedValue(mockEntities);

			// Act
			const result = await pullRequestService.listPullRequests(
				"testowner",
				"testrepo",
				"open",
			);

			// Assert
			expect(mockPullRequestRepo.listByStatus).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"open",
			);
			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("open");
		});

		it("should list only merged PRs when status filter is 'merged'", async () => {
			// Arrange
			const mockEntities = [
				new PullRequestEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 3,
					title: "PR 3",
					status: "merged",
					author: "user3",
					sourceBranch: "feature3",
					targetBranch: "main",
					mergeCommitSha: "abc123",
				}),
			];

			mockPullRequestRepo.listByStatus.mockResolvedValue(mockEntities);

			// Act
			const result = await pullRequestService.listPullRequests(
				"testowner",
				"testrepo",
				"merged",
			);

			// Assert
			expect(mockPullRequestRepo.listByStatus).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"merged",
			);
			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("merged");
		});

		it("should return empty array when no PRs exist", async () => {
			// Arrange
			mockPullRequestRepo.list.mockResolvedValue([]);

			// Act
			const result = await pullRequestService.listPullRequests(
				"testowner",
				"testrepo",
			);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("updatePullRequest", () => {
		it("should update an existing PR successfully", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
			};

			const existingEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: "Old Title",
				body: "Old body",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});

			const updatedEntity = existingEntity.updatePullRequest(updateRequest);

			mockPullRequestRepo.get.mockResolvedValue(existingEntity);
			mockPullRequestRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await pullRequestService.updatePullRequest(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);

			// Assert
			expect(mockPullRequestRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(mockPullRequestRepo.update).toHaveBeenCalledTimes(1);
			expect(result.title).toBe(updateRequest.title);
			expect(result.body).toBe(updateRequest.body);
			expect(result.status).toBe(updateRequest.status);
		});

		it("should throw EntityNotFoundError when PR does not exist", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				title: "Updated Title",
			};

			mockPullRequestRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.updatePullRequest(
					"testowner",
					"testrepo",
					999,
					updateRequest,
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPullRequestRepo.update).not.toHaveBeenCalled();
		});

		it("should allow partial updates", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				status: "closed",
			};

			const existingEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: "Test PR",
				body: "Test body",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});

			const updatedEntity = existingEntity.updatePullRequest(updateRequest);

			mockPullRequestRepo.get.mockResolvedValue(existingEntity);
			mockPullRequestRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await pullRequestService.updatePullRequest(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);

			// Assert
			expect(result.title).toBe(existingEntity.title); // Unchanged
			expect(result.body).toBe(existingEntity.body); // Unchanged
			expect(result.status).toBe("closed"); // Changed
		});

		it("should throw ValidationError for invalid update data", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				title: "", // Invalid: empty title
			};

			const existingEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: "Test PR",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});

			mockPullRequestRepo.get.mockResolvedValue(existingEntity);

			// Act & Assert - Entity.updatePullRequest will throw ValidationError
			await expect(
				pullRequestService.updatePullRequest(
					"testowner",
					"testrepo",
					1,
					updateRequest,
				),
			).rejects.toThrow(ValidationError);
			expect(mockPullRequestRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("deletePullRequest", () => {
		it("should delete an existing PR successfully", async () => {
			// Arrange
			const existingEntity = new PullRequestEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				title: "Test PR",
				status: "open",
				author: "testuser",
				sourceBranch: "feature",
				targetBranch: "main",
			});

			mockPullRequestRepo.get.mockResolvedValue(existingEntity);
			mockPullRequestRepo.delete.mockResolvedValue(undefined);

			// Act
			await pullRequestService.deletePullRequest("testowner", "testrepo", 1);

			// Assert
			expect(mockPullRequestRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(mockPullRequestRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
		});

		it("should throw EntityNotFoundError when PR does not exist", async () => {
			// Arrange
			mockPullRequestRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.deletePullRequest("testowner", "testrepo", 999),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPullRequestRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("createComment", () => {
		it("should create a new comment on a pull request successfully", async () => {
			// Arrange
			const createdComment = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-uuid-123",
				body: "This is a test comment",
				author: "commenter",
			});

			mockPRCommentRepo.create.mockResolvedValue(createdComment);

			// Act
			const result = await pullRequestService.createComment(
				"testowner",
				"testrepo",
				1,
				"commenter",
				"This is a test comment",
			);

			// Assert
			expect(mockPRCommentRepo.create).toHaveBeenCalledTimes(1);
			expect(mockPRCommentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					author: "commenter",
					body: "This is a test comment",
				}),
			);
			expect(result.comment_id).toBe("comment-uuid-123");
			expect(result.body).toBe("This is a test comment");
		});

		it("should throw ValidationError for empty comment body", async () => {
			// Act & Assert
			await expect(
				pullRequestService.createComment(
					"testowner",
					"testrepo",
					1,
					"commenter",
					"",
				),
			).rejects.toThrow(ValidationError);
			expect(mockPRCommentRepo.create).not.toHaveBeenCalled();
		});

		it("should throw ValidationError when pull request does not exist", async () => {
			// Arrange
			mockPRCommentRepo.create.mockRejectedValue(
				new ValidationError(
					"pr",
					"Pull request 'testowner/testrepo#999' does not exist",
				),
			);

			// Act & Assert
			await expect(
				pullRequestService.createComment(
					"testowner",
					"testrepo",
					999,
					"commenter",
					"Test comment",
				),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("getComment", () => {
		it("should retrieve an existing comment", async () => {
			// Arrange
			const comment = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-uuid-123",
				body: "Test comment",
				author: "commenter",
			});

			mockPRCommentRepo.get.mockResolvedValue(comment);

			// Act
			const result = await pullRequestService.getComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);

			// Assert
			expect(mockPRCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
			expect(result.comment_id).toBe("comment-uuid-123");
			expect(result.body).toBe("Test comment");
		});

		it("should throw EntityNotFoundError for non-existent comment", async () => {
			// Arrange
			mockPRCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.getComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
				),
			).rejects.toThrow(EntityNotFoundError);
		});
	});

	describe("listComments", () => {
		it("should list all comments for a pull request", async () => {
			// Arrange
			const comments = [
				new PRCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					commentId: "comment-1",
					body: "First comment",
					author: "user1",
				}),
				new PRCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					commentId: "comment-2",
					body: "Second comment",
					author: "user2",
				}),
			];

			mockPRCommentRepo.listByPR.mockResolvedValue(comments);

			// Act
			const result = await pullRequestService.listComments(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(mockPRCommentRepo.listByPR).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(result).toHaveLength(2);
			expect(result[0].comment_id).toBe("comment-1");
			expect(result[1].comment_id).toBe("comment-2");
		});

		it("should return empty array when no comments exist", async () => {
			// Arrange
			mockPRCommentRepo.listByPR.mockResolvedValue([]);

			// Act
			const result = await pullRequestService.listComments(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("updateComment", () => {
		it("should update an existing comment successfully", async () => {
			// Arrange
			const existingComment = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-uuid-123",
				body: "Old comment",
				author: "commenter",
			});

			const updatedComment = existingComment.updateWith({
				body: "Updated comment",
			});

			mockPRCommentRepo.get.mockResolvedValue(existingComment);
			mockPRCommentRepo.update.mockResolvedValue(updatedComment);

			// Act
			const result = await pullRequestService.updateComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
				"Updated comment",
			);

			// Assert
			expect(mockPRCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
			expect(mockPRCommentRepo.update).toHaveBeenCalledTimes(1);
			expect(result.body).toBe("Updated comment");
		});

		it("should throw EntityNotFoundError when comment does not exist", async () => {
			// Arrange
			mockPRCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.updateComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
					"Updated body",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPRCommentRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("deleteComment", () => {
		it("should delete an existing comment successfully", async () => {
			// Arrange
			const existingComment = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-uuid-123",
				body: "Test comment",
				author: "commenter",
			});

			mockPRCommentRepo.get.mockResolvedValue(existingComment);
			mockPRCommentRepo.delete.mockResolvedValue(undefined);

			// Act
			await pullRequestService.deleteComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);

			// Assert
			expect(mockPRCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
			expect(mockPRCommentRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
		});

		it("should throw EntityNotFoundError when comment does not exist", async () => {
			// Arrange
			mockPRCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.deleteComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPRCommentRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("addReaction", () => {
		it("should add a reaction to a pull request successfully", async () => {
			// Arrange
			const reaction = new ReactionEntity({
				owner: "testowner",
				repoName: "testrepo",
				targetType: "PR",
				targetId: "1",
				user: "reactor",
				emoji: "👍",
			});

			mockReactionRepo.create.mockResolvedValue(reaction);

			// Act
			const result = await pullRequestService.addReaction(
				"testowner",
				"testrepo",
				1,
				"👍",
				"reactor",
			);

			// Assert
			expect(mockReactionRepo.create).toHaveBeenCalledTimes(1);
			expect(mockReactionRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "reactor",
					emoji: "👍",
				}),
			);
			expect(result.emoji).toBe("👍");
			expect(result.target_type).toBe("PR");
		});

		it("should throw ValidationError for duplicate reaction", async () => {
			// Arrange
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("reaction", "Reaction already exists"),
			);

			// Act & Assert
			await expect(
				pullRequestService.addReaction(
					"testowner",
					"testrepo",
					1,
					"👍",
					"reactor",
				),
			).rejects.toThrow(ValidationError);
		});

		it("should throw ValidationError when pull request does not exist", async () => {
			// Arrange
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("target", "Pull request does not exist"),
			);

			// Act & Assert
			await expect(
				pullRequestService.addReaction(
					"testowner",
					"testrepo",
					999,
					"👍",
					"reactor",
				),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("removeReaction", () => {
		it("should remove a reaction from a pull request successfully", async () => {
			// Arrange
			const existingReaction = new ReactionEntity({
				owner: "testowner",
				repoName: "testrepo",
				targetType: "PR",
				targetId: "1",
				user: "reactor",
				emoji: "👍",
			});

			mockReactionRepo.get.mockResolvedValue(existingReaction);
			mockReactionRepo.delete.mockResolvedValue(undefined);

			// Act
			await pullRequestService.removeReaction(
				"testowner",
				"testrepo",
				1,
				"👍",
				"reactor",
			);

			// Assert
			expect(mockReactionRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"PR",
				"1",
				"reactor",
				"👍",
			);
			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"PR",
				"1",
				"reactor",
				"👍",
			);
		});

		it("should throw EntityNotFoundError when reaction does not exist", async () => {
			// Arrange
			mockReactionRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				pullRequestService.removeReaction(
					"testowner",
					"testrepo",
					1,
					"👍",
					"reactor",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockReactionRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("listReactions", () => {
		it("should list all reactions for a pull request", async () => {
			// Arrange
			const reactions = [
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await pullRequestService.listReactions(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(mockReactionRepo.listByTarget).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"PR",
				"1",
			);
			expect(result).toHaveLength(2);
			expect(result[0].emoji).toBe("👍");
			expect(result[1].emoji).toBe("❤️");
		});

		it("should apply limit when provided", async () => {
			// Arrange
			const reactions = Array.from(
				{ length: 10 },
				(_, i) =>
					new ReactionEntity({
						owner: "testowner",
						repoName: "testrepo",
						targetType: "PR",
						targetId: "1",
						user: `user${i}`,
						emoji: "👍",
					}),
			);

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await pullRequestService.listReactions(
				"testowner",
				"testrepo",
				1,
				5,
			);

			// Assert
			expect(result).toHaveLength(5);
		});

		it("should return empty array when no reactions exist", async () => {
			// Arrange
			mockReactionRepo.listByTarget.mockResolvedValue([]);

			// Act
			const result = await pullRequestService.listReactions(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("getReactionsByEmoji", () => {
		it("should get reactions filtered by emoji", async () => {
			// Arrange
			const reactions = [
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user3",
					emoji: "👍",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await pullRequestService.getReactionsByEmoji(
				"testowner",
				"testrepo",
				1,
				"👍",
			);

			// Assert
			expect(mockReactionRepo.listByTarget).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"PR",
				"1",
			);
			expect(result).toHaveLength(2);
			expect(result.every((r) => r.emoji === "👍")).toBe(true);
		});

		it("should apply limit to filtered reactions", async () => {
			// Arrange
			const reactions = Array.from(
				{ length: 10 },
				(_, i) =>
					new ReactionEntity({
						owner: "testowner",
						repoName: "testrepo",
						targetType: "PR",
						targetId: "1",
						user: `user${i}`,
						emoji: "👍",
					}),
			);

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await pullRequestService.getReactionsByEmoji(
				"testowner",
				"testrepo",
				1,
				"👍",
				3,
			);

			// Assert
			expect(result).toHaveLength(3);
		});

		it("should return empty array when no reactions match emoji", async () => {
			// Arrange
			const reactions = [
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "PR",
					targetId: "1",
					user: "user1",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await pullRequestService.getReactionsByEmoji(
				"testowner",
				"testrepo",
				1,
				"👍",
			);

			// Assert
			expect(result).toEqual([]);
		});
	});
});
