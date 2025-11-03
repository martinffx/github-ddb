import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type {
	OrganizationService,
	RepositoryService,
	UserService,
} from "../services";
import type { IssueService } from "../services/IssueService";
import type { PullRequestService } from "../services/PullRequestService";
import type {
	PullRequestCreateRequest,
	PullRequestUpdateRequest,
} from "./schema";
import { EntityNotFoundError, ValidationError } from "../shared";

describe("PullRequestRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockPullRequestService = jest.mocked<PullRequestService>({
		createPullRequest: jest.fn(),
		getPullRequest: jest.fn(),
		listPullRequests: jest.fn(),
		updatePullRequest: jest.fn(),
		deletePullRequest: jest.fn(),
	} as unknown as PullRequestService);
	const mockServices = {
		userService: {} as unknown as UserService,
		organizationService: {} as unknown as OrganizationService,
		repositoryService: {} as unknown as RepositoryService,
		issueService: {} as unknown as IssueService,
		pullRequestService: mockPullRequestService,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(async () => {
		app = await createApp({ config, services: mockServices });
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("POST /v1/repositories/:owner/:repoName/pulls", () => {
		it("should create a new pull request successfully", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				body: "Test body",
				status: "open",
				author: "testuser",
				source_branch: "feature-branch",
				target_branch: "main",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Test PR",
				body: "Test body",
				status: "open",
				author: "testuser",
				source_branch: "feature-branch",
				target_branch: "main",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockPullRequestService.createPullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			expect(mockPullRequestService.createPullRequest).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				request,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
			expect(body.pr_number).toBe(1);
		});

		it("should create PR with default status when not provided", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Test PR",
				status: "open",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockPullRequestService.createPullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			const body = JSON.parse(result.body);
			expect(body.status).toBe("open");
		});

		it("should return 400 when repository does not exist", async () => {
			// Arrange
			const request: PullRequestCreateRequest = {
				title: "Test PR",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
			};

			mockPullRequestService.createPullRequest.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
			expect(body.detail).toContain("does not exist");
		});

		it("should return 400 for missing required fields", async () => {
			// Arrange
			const request = {
				body: "Test body",
				// missing title, author, and branches
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});

		it("should return 400 for invalid status value", async () => {
			// Arrange
			const request = {
				title: "Test PR",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				status: "invalid",
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/pulls/:prNumber", () => {
		it("should retrieve an existing pull request", async () => {
			// Arrange
			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Test PR",
				body: "Test body",
				status: "open",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockPullRequestService.getPullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockPullRequestService.getPullRequest).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 for non-existent PR", async () => {
			// Arrange
			mockPullRequestService.getPullRequest.mockRejectedValue(
				new EntityNotFoundError("PullRequestEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls/999",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body).toHaveProperty("title", "Not Found");
			expect(body.detail).toContain("not found");
		});

		it("should return 400 for invalid PR number", async () => {
			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls/invalid",
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/pulls", () => {
		it("should list all PRs when no status filter provided", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					pr_number: 1,
					title: "PR 1",
					status: "open",
					author: "user1",
					source_branch: "feature1",
					target_branch: "main",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					owner: "testowner",
					repo_name: "testrepo",
					pr_number: 2,
					title: "PR 2",
					status: "closed",
					author: "user2",
					source_branch: "feature2",
					target_branch: "main",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockPullRequestService.listPullRequests.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockPullRequestService.listPullRequests).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				undefined,
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(2);
		});

		it("should list only open PRs when status filter is 'open'", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					pr_number: 1,
					title: "PR 1",
					status: "open",
					author: "user1",
					source_branch: "feature1",
					target_branch: "main",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockPullRequestService.listPullRequests.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls?status=open",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockPullRequestService.listPullRequests).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"open",
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(1);
			expect(body[0].status).toBe("open");
		});

		it("should list only merged PRs when status filter is 'merged'", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					pr_number: 3,
					title: "PR 3",
					status: "merged",
					author: "user3",
					source_branch: "feature3",
					target_branch: "main",
					merge_commit_sha: "abc123",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockPullRequestService.listPullRequests.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls?status=merged",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockPullRequestService.listPullRequests).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"merged",
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(1);
			expect(body[0].status).toBe("merged");
		});

		it("should return empty array when no PRs exist", async () => {
			// Arrange
			mockPullRequestService.listPullRequests.mockResolvedValue([]);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual([]);
		});

		it("should return 400 for invalid status value", async () => {
			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls?status=invalid",
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("PATCH /v1/repositories/:owner/:repoName/pulls/:prNumber", () => {
		it("should update an existing PR successfully", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T01:00:00.000Z",
			};

			mockPullRequestService.updatePullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockPullRequestService.updatePullRequest).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 when updating non-existent PR", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				title: "Updated Title",
			};

			mockPullRequestService.updatePullRequest.mockRejectedValue(
				new EntityNotFoundError("PullRequestEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/pulls/999",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body.detail).toContain("not found");
		});

		it("should allow partial updates", async () => {
			// Arrange
			const updateRequest: PullRequestUpdateRequest = {
				status: "merged",
				merge_commit_sha: "abc123",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Original Title",
				body: "Original body",
				status: "merged",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				merge_commit_sha: "abc123",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T01:00:00.000Z",
			};

			mockPullRequestService.updatePullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body.status).toBe("merged");
			expect(body.merge_commit_sha).toBe("abc123");
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const updateRequest = {
				title: "", // Invalid: empty title
			};

			mockPullRequestService.updatePullRequest.mockRejectedValue(
				new ValidationError("title", "Title is required"),
			);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});

		it("should allow empty update request (no-op)", async () => {
			// Arrange
			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				pr_number: 1,
				title: "Original Title",
				body: "Original body",
				status: "open",
				author: "testuser",
				source_branch: "feature",
				target_branch: "main",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockPullRequestService.updatePullRequest.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
				payload: {},
			});

			// Assert - Empty payload is valid for PATCH (no-op update)
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});
	});

	describe("DELETE /v1/repositories/:owner/:repoName/pulls/:prNumber", () => {
		it("should delete an existing PR successfully", async () => {
			// Arrange
			mockPullRequestService.deletePullRequest.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockPullRequestService.deletePullRequest).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(result.body).toBe("");
		});

		it("should return 404 when deleting non-existent PR", async () => {
			// Arrange
			mockPullRequestService.deletePullRequest.mockRejectedValue(
				new EntityNotFoundError("PullRequestEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testowner/testrepo/pulls/999",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body.detail).toContain("not found");
		});
	});

	describe("Error Handling", () => {
		it("should handle unexpected errors with 500", async () => {
			// Arrange
			mockPullRequestService.getPullRequest.mockRejectedValue(
				new Error("Unexpected database error"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/pulls/1",
			});

			// Assert
			expect(result.statusCode).toBe(500);
		});

		it("should include error details in problem detail format", async () => {
			// Arrange
			mockPullRequestService.createPullRequest.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/pulls",
				payload: {
					title: "Test PR",
					author: "testuser",
					source_branch: "feature",
					target_branch: "main",
				},
			});

			// Assert
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("type");
			expect(body).toHaveProperty("title");
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("detail");
		});
	});
});
