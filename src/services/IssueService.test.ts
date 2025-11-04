import { IssueService } from "./IssueService";
import type {
	IssueRepository,
	IssueCommentRepository,
	ReactionRepository,
} from "../repos";
import { IssueEntity } from "./entities";
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
});
