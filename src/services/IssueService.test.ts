import { IssueService } from "./IssueService";
import type {
	IssueRepository,
	IssueCommentRepository,
	ReactionRepository,
} from "../repos";
import { IssueEntity, IssueCommentEntity, ReactionEntity } from "./entities";
import { EntityNotFoundError, ValidationError } from "../shared";
import type { IssueCreateRequest, IssueUpdateRequest } from "../routes/schema";

describe("IssueService", () => {
	const mockIssueRepo = jest.mocked<IssueRepository>({
		create: jest.fn(),
		get: jest.fn(),
		list: jest.fn(),
		listByStatus: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as IssueRepository);

	const mockIssueCommentRepo = jest.mocked<IssueCommentRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByIssue: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as IssueCommentRepository);

	const mockReactionRepo = jest.mocked<ReactionRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByTarget: jest.fn(),
		delete: jest.fn(),
	} as unknown as ReactionRepository);

	const issueService = new IssueService(
		mockIssueRepo,
		mockIssueCommentRepo,
		mockReactionRepo,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createIssue", () => {
		it("should create a new issue successfully", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				body: "Test issue body",
				status: "open",
				author: "testuser",
				assignees: ["user1", "user2"],
				labels: ["bug", "urgent"],
			};

			const mockEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: request.title,
				body: request.body,
				status: "open",
				author: request.author,
				assignees: request.assignees ?? [],
				labels: request.labels ?? [],
			});

			mockIssueRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await issueService.createIssue(
				"testowner",
				"testrepo",
				request,
			);

			// Assert
			expect(mockIssueRepo.create).toHaveBeenCalledTimes(1);
			expect(mockIssueRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					title: request.title,
					body: request.body,
					status: request.status,
					author: request.author,
					assignees: request.assignees,
					labels: request.labels,
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.issue_number).toBe(1);
			expect(result.title).toBe(request.title);
		});

		it("should create issue with default status 'open' when not provided", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				author: "testuser",
			};

			const mockEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: request.title,
				status: "open",
				author: request.author,
				assignees: [],
				labels: [],
			});

			mockIssueRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await issueService.createIssue(
				"testowner",
				"testrepo",
				request,
			);

			// Assert
			expect(result.status).toBe("open");
			expect(result.assignees).toEqual([]);
			expect(result.labels).toEqual([]);
		});

		it("should throw ValidationError when repository does not exist", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				author: "testuser",
			};

			mockIssueRepo.create.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act & Assert
			await expect(
				issueService.createIssue("testowner", "testrepo", request),
			).rejects.toThrow(ValidationError);
			await expect(
				issueService.createIssue("testowner", "testrepo", request),
			).rejects.toThrow("does not exist");
		});

		it("should throw ValidationError for invalid issue data", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "", // Invalid: empty title
				author: "testuser",
			};

			// Act & Assert - Entity.fromRequest will throw ValidationError
			await expect(
				issueService.createIssue("testowner", "testrepo", request),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("getIssue", () => {
		it("should retrieve an existing issue", async () => {
			// Arrange
			const mockEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: "Test Issue",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: ["user1"],
				labels: ["bug"],
			});

			mockIssueRepo.get.mockResolvedValue(mockEntity);

			// Act
			const result = await issueService.getIssue("testowner", "testrepo", 1);

			// Assert
			expect(mockIssueRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.issue_number).toBe(1);
			expect(result.title).toBe("Test Issue");
		});

		it("should throw EntityNotFoundError for non-existent issue", async () => {
			// Arrange
			mockIssueRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.getIssue("testowner", "testrepo", 999),
			).rejects.toThrow(EntityNotFoundError);
			await expect(
				issueService.getIssue("testowner", "testrepo", 999),
			).rejects.toThrow("not found");
		});
	});

	describe("listIssues", () => {
		it("should list all issues when no status filter provided", async () => {
			// Arrange
			const mockEntities = [
				new IssueEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					title: "Issue 1",
					status: "open",
					author: "user1",
					assignees: [],
					labels: [],
				}),
				new IssueEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 2,
					title: "Issue 2",
					status: "closed",
					author: "user2",
					assignees: [],
					labels: [],
				}),
			];

			mockIssueRepo.list.mockResolvedValue(mockEntities);

			// Act
			const result = await issueService.listIssues("testowner", "testrepo");

			// Assert
			expect(mockIssueRepo.list).toHaveBeenCalledWith("testowner", "testrepo");
			expect(result).toHaveLength(2);
			expect(result[0].issue_number).toBe(1);
			expect(result[1].issue_number).toBe(2);
		});

		it("should list only open issues when status filter is 'open'", async () => {
			// Arrange
			const mockEntities = [
				new IssueEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					title: "Issue 1",
					status: "open",
					author: "user1",
					assignees: [],
					labels: [],
				}),
			];

			mockIssueRepo.listByStatus.mockResolvedValue(mockEntities);

			// Act
			const result = await issueService.listIssues(
				"testowner",
				"testrepo",
				"open",
			);

			// Assert
			expect(mockIssueRepo.listByStatus).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"open",
			);
			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("open");
		});

		it("should list only closed issues when status filter is 'closed'", async () => {
			// Arrange
			const mockEntities = [
				new IssueEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 2,
					title: "Issue 2",
					status: "closed",
					author: "user2",
					assignees: [],
					labels: [],
				}),
			];

			mockIssueRepo.listByStatus.mockResolvedValue(mockEntities);

			// Act
			const result = await issueService.listIssues(
				"testowner",
				"testrepo",
				"closed",
			);

			// Assert
			expect(mockIssueRepo.listByStatus).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"closed",
			);
			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("closed");
		});

		it("should return empty array when no issues exist", async () => {
			// Arrange
			mockIssueRepo.list.mockResolvedValue([]);

			// Act
			const result = await issueService.listIssues("testowner", "testrepo");

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("updateIssue", () => {
		it("should update an existing issue successfully", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
				assignees: ["newuser"],
				labels: ["resolved"],
			};

			const existingEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: "Old Title",
				body: "Old body",
				status: "open",
				author: "testuser",
				assignees: ["olduser"],
				labels: ["bug"],
			});

			const updatedEntity = existingEntity.updateIssue(updateRequest);

			mockIssueRepo.get.mockResolvedValue(existingEntity);
			mockIssueRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await issueService.updateIssue(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);

			// Assert
			expect(mockIssueRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(mockIssueRepo.update).toHaveBeenCalledTimes(1);
			expect(result.title).toBe(updateRequest.title);
			expect(result.body).toBe(updateRequest.body);
			expect(result.status).toBe(updateRequest.status);
			expect(result.assignees).toEqual(updateRequest.assignees);
			expect(result.labels).toEqual(updateRequest.labels);
		});

		it("should throw EntityNotFoundError when issue does not exist", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				title: "Updated Title",
			};

			mockIssueRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.updateIssue("testowner", "testrepo", 999, updateRequest),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueRepo.update).not.toHaveBeenCalled();
		});

		it("should allow partial updates", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				status: "closed",
			};

			const existingEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: "Test Issue",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: ["user1"],
				labels: ["bug"],
			});

			const updatedEntity = existingEntity.updateIssue(updateRequest);

			mockIssueRepo.get.mockResolvedValue(existingEntity);
			mockIssueRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await issueService.updateIssue(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);

			// Assert
			expect(result.title).toBe(existingEntity.title); // Unchanged
			expect(result.body).toBe(existingEntity.body); // Unchanged
			expect(result.status).toBe("closed"); // Changed
			expect(result.assignees).toEqual(existingEntity.assignees); // Unchanged
		});

		it("should throw ValidationError for invalid update data", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				title: "", // Invalid: empty title
			};

			const existingEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: "Test Issue",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});

			mockIssueRepo.get.mockResolvedValue(existingEntity);

			// Act & Assert - Entity.updateIssue will throw ValidationError
			await expect(
				issueService.updateIssue("testowner", "testrepo", 1, updateRequest),
			).rejects.toThrow(ValidationError);
			expect(mockIssueRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("deleteIssue", () => {
		it("should delete an existing issue successfully", async () => {
			// Arrange
			const existingEntity = new IssueEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				title: "Test Issue",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
			});

			mockIssueRepo.get.mockResolvedValue(existingEntity);
			mockIssueRepo.delete.mockResolvedValue(undefined);

			// Act
			await issueService.deleteIssue("testowner", "testrepo", 1);

			// Assert
			expect(mockIssueRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(mockIssueRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
		});

		it("should throw EntityNotFoundError when issue does not exist", async () => {
			// Arrange
			mockIssueRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.deleteIssue("testowner", "testrepo", 999),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("createComment", () => {
		it("should create a new comment on an issue successfully", async () => {
			// Arrange
			const createdComment = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-uuid-123",
				body: "This is a test comment",
				author: "commenter",
			});

			mockIssueCommentRepo.create.mockResolvedValue(createdComment);

			// Act
			const result = await issueService.createComment(
				"testowner",
				"testrepo",
				1,
				"commenter",
				"This is a test comment",
			);

			// Assert
			expect(mockIssueCommentRepo.create).toHaveBeenCalledTimes(1);
			expect(mockIssueCommentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
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
				issueService.createComment("testowner", "testrepo", 1, "commenter", ""),
			).rejects.toThrow(ValidationError);
			expect(mockIssueCommentRepo.create).not.toHaveBeenCalled();
		});

		it("should throw ValidationError when issue does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.create.mockRejectedValue(
				new ValidationError(
					"issue",
					"Issue 'testowner/testrepo#999' does not exist",
				),
			);

			// Act & Assert
			await expect(
				issueService.createComment(
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
			const comment = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-uuid-123",
				body: "Test comment",
				author: "commenter",
			});

			mockIssueCommentRepo.get.mockResolvedValue(comment);

			// Act
			const result = await issueService.getComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);

			// Assert
			expect(mockIssueCommentRepo.get).toHaveBeenCalledWith(
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
			mockIssueCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.getComment("testowner", "testrepo", 1, "nonexistent"),
			).rejects.toThrow(EntityNotFoundError);
		});
	});

	describe("listComments", () => {
		it("should list all comments for an issue", async () => {
			// Arrange
			const comments = [
				new IssueCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					commentId: "comment-1",
					body: "First comment",
					author: "user1",
				}),
				new IssueCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					commentId: "comment-2",
					body: "Second comment",
					author: "user2",
				}),
			];

			mockIssueCommentRepo.listByIssue.mockResolvedValue(comments);

			// Act
			const result = await issueService.listComments(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(mockIssueCommentRepo.listByIssue).toHaveBeenCalledWith(
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
			mockIssueCommentRepo.listByIssue.mockResolvedValue([]);

			// Act
			const result = await issueService.listComments(
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
			const existingComment = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-uuid-123",
				body: "Old comment",
				author: "commenter",
			});

			const updatedComment = existingComment.updateWith({
				body: "Updated comment",
			});

			mockIssueCommentRepo.get.mockResolvedValue(existingComment);
			mockIssueCommentRepo.update.mockResolvedValue(updatedComment);

			// Act
			const result = await issueService.updateComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
				"Updated comment",
			);

			// Assert
			expect(mockIssueCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
			expect(mockIssueCommentRepo.update).toHaveBeenCalledTimes(1);
			expect(result.body).toBe("Updated comment");
		});

		it("should throw EntityNotFoundError when comment does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.updateComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
					"Updated body",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueCommentRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("deleteComment", () => {
		it("should delete an existing comment successfully", async () => {
			// Arrange
			const existingComment = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-uuid-123",
				body: "Test comment",
				author: "commenter",
			});

			mockIssueCommentRepo.get.mockResolvedValue(existingComment);
			mockIssueCommentRepo.delete.mockResolvedValue(undefined);

			// Act
			await issueService.deleteComment(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);

			// Assert
			expect(mockIssueCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
			expect(mockIssueCommentRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-uuid-123",
			);
		});

		it("should throw EntityNotFoundError when comment does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				issueService.deleteComment("testowner", "testrepo", 1, "nonexistent"),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueCommentRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("addReaction", () => {
		it("should add a reaction to an issue successfully", async () => {
			// Arrange
			const reaction = new ReactionEntity({
				owner: "testowner",
				repoName: "testrepo",
				targetType: "ISSUE",
				targetId: "1",
				user: "reactor",
				emoji: "👍",
			});

			mockReactionRepo.create.mockResolvedValue(reaction);

			// Act
			const result = await issueService.addReaction(
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
					targetType: "ISSUE",
					targetId: "1",
					user: "reactor",
					emoji: "👍",
				}),
			);
			expect(result.emoji).toBe("👍");
			expect(result.target_type).toBe("ISSUE");
		});

		it("should throw ValidationError for duplicate reaction", async () => {
			// Arrange
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("reaction", "Reaction already exists"),
			);

			// Act & Assert
			await expect(
				issueService.addReaction("testowner", "testrepo", 1, "👍", "reactor"),
			).rejects.toThrow(ValidationError);
		});

		it("should throw ValidationError when issue does not exist", async () => {
			// Arrange
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("target", "Issue does not exist"),
			);

			// Act & Assert
			await expect(
				issueService.addReaction("testowner", "testrepo", 999, "👍", "reactor"),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("removeReaction", () => {
		it("should remove a reaction from an issue successfully", async () => {
			// Arrange
			const existingReaction = new ReactionEntity({
				owner: "testowner",
				repoName: "testrepo",
				targetType: "ISSUE",
				targetId: "1",
				user: "reactor",
				emoji: "👍",
			});

			mockReactionRepo.get.mockResolvedValue(existingReaction);
			mockReactionRepo.delete.mockResolvedValue(undefined);

			// Act
			await issueService.removeReaction(
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
				"ISSUE",
				"1",
				"reactor",
				"👍",
			);
			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"ISSUE",
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
				issueService.removeReaction(
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
		it("should list all reactions for an issue", async () => {
			// Arrange
			const reactions = [
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "ISSUE",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await issueService.listReactions(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(mockReactionRepo.listByTarget).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"ISSUE",
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
						targetType: "ISSUE",
						targetId: "1",
						user: `user${i}`,
						emoji: "👍",
					}),
			);

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await issueService.listReactions(
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
			const result = await issueService.listReactions(
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
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "ISSUE",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}),
				new ReactionEntity({
					owner: "testowner",
					repoName: "testrepo",
					targetType: "ISSUE",
					targetId: "1",
					user: "user3",
					emoji: "👍",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await issueService.getReactionsByEmoji(
				"testowner",
				"testrepo",
				1,
				"👍",
			);

			// Assert
			expect(mockReactionRepo.listByTarget).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"ISSUE",
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
						targetType: "ISSUE",
						targetId: "1",
						user: `user${i}`,
						emoji: "👍",
					}),
			);

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await issueService.getReactionsByEmoji(
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
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(reactions);

			// Act
			const result = await issueService.getReactionsByEmoji(
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
