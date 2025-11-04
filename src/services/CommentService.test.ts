import { CommentService } from "./CommentService";
import type { IssueCommentRepository, PRCommentRepository } from "../repos";
import { IssueCommentEntity, PRCommentEntity } from "./entities";
import { EntityNotFoundError, ValidationError } from "../shared";

describe("CommentService", () => {
	const mockIssueCommentRepo = jest.mocked<IssueCommentRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByIssue: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as IssueCommentRepository);

	const mockPRCommentRepo = jest.mocked<PRCommentRepository>({
		create: jest.fn(),
		get: jest.fn(),
		listByPR: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	} as unknown as PRCommentRepository);

	const commentService = new CommentService(
		mockIssueCommentRepo,
		mockPRCommentRepo,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createIssueComment", () => {
		it("should create an issue comment successfully", async () => {
			// Arrange
			const mockEntity = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "test-comment-id",
				body: "Test comment body",
				author: "testauthor",
			});

			mockIssueCommentRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await commentService.createIssueComment(
				"testowner",
				"testrepo",
				1,
				"testauthor",
				"Test comment body",
			);

			// Assert
			expect(mockIssueCommentRepo.create).toHaveBeenCalledTimes(1);
			expect(mockIssueCommentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					body: "Test comment body",
					author: "testauthor",
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.owner).toBe("testowner");
			expect(result.body).toBe("Test comment body");
		});

		it("should throw ValidationError if issue does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.create.mockRejectedValue(
				new ValidationError(
					"issue",
					"Issue 'testowner/testrepo#1' does not exist",
				),
			);

			// Act & Assert
			await expect(
				commentService.createIssueComment(
					"testowner",
					"testrepo",
					1,
					"testauthor",
					"body",
				),
			).rejects.toThrow(ValidationError);
		});

		it("should throw ValidationError for empty body", async () => {
			// Act & Assert
			await expect(
				commentService.createIssueComment(
					"testowner",
					"testrepo",
					1,
					"testauthor",
					"",
				),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("createPRComment", () => {
		it("should create a PR comment successfully", async () => {
			// Arrange
			const mockEntity = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "test-comment-id",
				body: "Test PR comment",
				author: "testauthor",
			});

			mockPRCommentRepo.create.mockResolvedValue(mockEntity);

			// Act
			const result = await commentService.createPRComment(
				"testowner",
				"testrepo",
				1,
				"testauthor",
				"Test PR comment",
			);

			// Assert
			expect(mockPRCommentRepo.create).toHaveBeenCalledTimes(1);
			expect(mockPRCommentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					body: "Test PR comment",
					author: "testauthor",
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
		});

		it("should throw ValidationError if PR does not exist", async () => {
			// Arrange
			mockPRCommentRepo.create.mockRejectedValue(
				new ValidationError("pr", "Pull request does not exist"),
			);

			// Act & Assert
			await expect(
				commentService.createPRComment(
					"testowner",
					"testrepo",
					1,
					"testauthor",
					"body",
				),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("listIssueComments", () => {
		it("should return all comments for an issue", async () => {
			// Arrange
			const mockEntities = [
				new IssueCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					commentId: "comment-1",
					body: "First comment",
					author: "author1",
				}),
				new IssueCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					issueNumber: 1,
					commentId: "comment-2",
					body: "Second comment",
					author: "author2",
				}),
			];

			mockIssueCommentRepo.listByIssue.mockResolvedValue(mockEntities);

			// Act
			const result = await commentService.listIssueComments(
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

		it("should return empty array if no comments exist", async () => {
			// Arrange
			mockIssueCommentRepo.listByIssue.mockResolvedValue([]);

			// Act
			const result = await commentService.listIssueComments(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("listPRComments", () => {
		it("should return all comments for a PR", async () => {
			// Arrange
			const mockEntities = [
				new PRCommentEntity({
					owner: "testowner",
					repoName: "testrepo",
					prNumber: 1,
					commentId: "comment-1",
					body: "First PR comment",
					author: "author1",
				}),
			];

			mockPRCommentRepo.listByPR.mockResolvedValue(mockEntities);

			// Act
			const result = await commentService.listPRComments(
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
			expect(result).toHaveLength(1);
			expect(result[0].comment_id).toBe("comment-1");
		});

		it("should return empty array if no comments exist", async () => {
			// Arrange
			mockPRCommentRepo.listByPR.mockResolvedValue([]);

			// Act
			const result = await commentService.listPRComments(
				"testowner",
				"testrepo",
				1,
			);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("updateIssueComment", () => {
		it("should update an issue comment successfully", async () => {
			// Arrange
			const existingEntity = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-1",
				body: "Old body",
				author: "testauthor",
			});

			const updatedEntity = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-1",
				body: "Updated body",
				author: "testauthor",
			});

			mockIssueCommentRepo.get.mockResolvedValue(existingEntity);
			mockIssueCommentRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await commentService.updateIssueComment(
				"testowner",
				"testrepo",
				1,
				"comment-1",
				"Updated body",
			);

			// Assert
			expect(mockIssueCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
			expect(mockIssueCommentRepo.update).toHaveBeenCalledTimes(1);
			expect(result.body).toBe("Updated body");
		});

		it("should throw EntityNotFoundError if comment does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				commentService.updateIssueComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
					"body",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueCommentRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("updatePRComment", () => {
		it("should update a PR comment successfully", async () => {
			// Arrange
			const existingEntity = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-1",
				body: "Old body",
				author: "testauthor",
			});

			const updatedEntity = existingEntity.updateWith({ body: "Updated body" });

			mockPRCommentRepo.get.mockResolvedValue(existingEntity);
			mockPRCommentRepo.update.mockResolvedValue(updatedEntity);

			// Act
			const result = await commentService.updatePRComment(
				"testowner",
				"testrepo",
				1,
				"comment-1",
				"Updated body",
			);

			// Assert
			expect(mockPRCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
			expect(mockPRCommentRepo.update).toHaveBeenCalledTimes(1);
			expect(result.body).toBe("Updated body");
		});

		it("should throw EntityNotFoundError if comment does not exist", async () => {
			// Arrange
			mockPRCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				commentService.updatePRComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
					"body",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPRCommentRepo.update).not.toHaveBeenCalled();
		});
	});

	describe("deleteIssueComment", () => {
		it("should delete an issue comment successfully", async () => {
			// Arrange
			const existingEntity = new IssueCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				issueNumber: 1,
				commentId: "comment-1",
				body: "Test body",
				author: "testauthor",
			});

			mockIssueCommentRepo.get.mockResolvedValue(existingEntity);
			mockIssueCommentRepo.delete.mockResolvedValue(undefined);

			// Act
			await commentService.deleteIssueComment(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);

			// Assert
			expect(mockIssueCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
			expect(mockIssueCommentRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
		});

		it("should throw EntityNotFoundError if comment does not exist", async () => {
			// Arrange
			mockIssueCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				commentService.deleteIssueComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockIssueCommentRepo.delete).not.toHaveBeenCalled();
		});
	});

	describe("deletePRComment", () => {
		it("should delete a PR comment successfully", async () => {
			// Arrange
			const existingEntity = new PRCommentEntity({
				owner: "testowner",
				repoName: "testrepo",
				prNumber: 1,
				commentId: "comment-1",
				body: "Test body",
				author: "testauthor",
			});

			mockPRCommentRepo.get.mockResolvedValue(existingEntity);
			mockPRCommentRepo.delete.mockResolvedValue(undefined);

			// Act
			await commentService.deletePRComment(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);

			// Assert
			expect(mockPRCommentRepo.get).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
			expect(mockPRCommentRepo.delete).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				"comment-1",
			);
		});

		it("should throw EntityNotFoundError if comment does not exist", async () => {
			// Arrange
			mockPRCommentRepo.get.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				commentService.deletePRComment(
					"testowner",
					"testrepo",
					1,
					"nonexistent",
				),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockPRCommentRepo.delete).not.toHaveBeenCalled();
		});
	});
});
