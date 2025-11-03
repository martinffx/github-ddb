import { PullRequestService } from "./PullRequestService";
import type { PullRequestRepository } from "../repos";
import { PullRequestEntity } from "./entities";
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
	const pullRequestService = new PullRequestService(mockPullRequestRepo);

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
});
