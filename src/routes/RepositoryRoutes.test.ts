import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type {
	OrganizationService,
	UserService,
	IssueService,
	PullRequestService,
} from "../services";
import type { RepositoryService } from "../services/RepositoryService";
import type {
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
} from "./schema";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

describe("RepositoryRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockRepositoryService = jest.mocked<RepositoryService>({
		createRepository: jest.fn(),
		getRepository: jest.fn(),
		updateRepository: jest.fn(),
		deleteRepository: jest.fn(),
		listRepositoriesByOwner: jest.fn(),
		starRepository: jest.fn(),
		unstarRepository: jest.fn(),
		isStarred: jest.fn(),
		listUserStars: jest.fn(),
		createFork: jest.fn(),
		deleteFork: jest.fn(),
		listForks: jest.fn(),
		getFork: jest.fn(),
	} as unknown as RepositoryService);
	const mockIssueService = jest.mocked<IssueService>({
		createIssue: jest.fn(),
		getIssue: jest.fn(),
		listIssues: jest.fn(),
		updateIssue: jest.fn(),
		deleteIssue: jest.fn(),
		createComment: jest.fn(),
		getComment: jest.fn(),
		listComments: jest.fn(),
		updateComment: jest.fn(),
		deleteComment: jest.fn(),
		addReaction: jest.fn(),
		listReactions: jest.fn(),
		removeReaction: jest.fn(),
	} as unknown as IssueService);
	const mockPullRequestService = jest.mocked<PullRequestService>({
		createPullRequest: jest.fn(),
		getPullRequest: jest.fn(),
		listPullRequests: jest.fn(),
		updatePullRequest: jest.fn(),
		deletePullRequest: jest.fn(),
		createComment: jest.fn(),
		getComment: jest.fn(),
		listComments: jest.fn(),
		updateComment: jest.fn(),
		deleteComment: jest.fn(),
		addReaction: jest.fn(),
		listReactions: jest.fn(),
		removeReaction: jest.fn(),
	} as unknown as PullRequestService);
	const mockServices = {
		userService: {} as unknown as UserService,
		organizationService: {} as unknown as OrganizationService,
		repositoryService: mockRepositoryService,
		issueService: mockIssueService,
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

	describe("POST /repositories", () => {
		it("should create a new repository successfully", async () => {
			// Arrange
			const request: RepositoryCreateRequest = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Test repository",
				is_private: false,
				language: "TypeScript",
			};

			const response = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Test repository",
				is_private: false,
				language: "TypeScript",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockRepositoryService.createRepository.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			expect(mockRepositoryService.createRepository).toHaveBeenCalledWith(
				request,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 409 when repository already exists", async () => {
			// Arrange
			const request: RepositoryCreateRequest = {
				owner: "testuser",
				repo_name: "existing-repo",
			};

			mockRepositoryService.createRepository.mockRejectedValue(
				new DuplicateEntityError(
					"RepositoryEntity",
					"REPO#testuser#existing-repo",
				),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(409);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("type");
			expect(body).toHaveProperty("title");
			expect(body).toHaveProperty("status", 409);
			expect(body).toHaveProperty("detail");
			expect(body.detail).toContain("already exists");
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const request = {
				owner: "testuser",
				repo_name: "test-repo",
				is_private: "not-a-boolean",
			};

			mockRepositoryService.createRepository.mockRejectedValue(
				new ValidationError("is_private", "Must be a boolean"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
			expect(body).toHaveProperty("title", "Bad Request");
		});

		it("should return 400 for missing required fields", async () => {
			// Arrange - missing repo_name
			const request = {
				owner: "testuser",
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});

		it("should return 400 for invalid request body", async () => {
			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: "invalid-json-string",
				headers: {
					"content-type": "text/plain",
				},
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /repositories/:owner/:repoName", () => {
		it("should retrieve an existing repository", async () => {
			// Arrange
			const response = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Test repository",
				is_private: false,
				language: "TypeScript",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockRepositoryService.getRepository.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockRepositoryService.getRepository).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 for non-existent repository", async () => {
			// Arrange
			mockRepositoryService.getRepository.mockRejectedValue(
				new EntityNotFoundError(
					"RepositoryEntity",
					"REPO#testuser#nonexistent",
				),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/nonexistent",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body).toHaveProperty("title", "Not Found");
			expect(body.detail).toContain("not found");
		});

		it("should handle owner and repoName with special characters", async () => {
			// Arrange
			const response = {
				owner: "test-user_123",
				repo_name: "my-awesome-repo_v2",
				is_private: false,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockRepositoryService.getRepository.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/test-user_123/my-awesome-repo_v2",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockRepositoryService.getRepository).toHaveBeenCalledWith(
				"test-user_123",
				"my-awesome-repo_v2",
			);
		});
	});

	describe("PUT /repositories/:owner/:repoName", () => {
		it("should update an existing repository successfully", async () => {
			// Arrange
			const updateRequest: RepositoryUpdateRequest = {
				description: "Updated description",
				is_private: true,
				language: "JavaScript",
			};

			const response = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Updated description",
				is_private: true,
				language: "JavaScript",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockRepositoryService.updateRepository.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/test-repo",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockRepositoryService.updateRepository).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
				updateRequest,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 when updating non-existent repository", async () => {
			// Arrange
			const updateRequest: RepositoryUpdateRequest = {
				description: "Updated description",
			};

			mockRepositoryService.updateRepository.mockRejectedValue(
				new EntityNotFoundError(
					"RepositoryEntity",
					"REPO#testuser#nonexistent",
				),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/nonexistent",
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
			const updateRequest: RepositoryUpdateRequest = {
				description: "Only update description",
			};

			const response = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Only update description",
				is_private: false,
				language: "TypeScript",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockRepositoryService.updateRepository.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/test-repo",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockRepositoryService.updateRepository).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
				updateRequest,
			);
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const updateRequest = {
				is_private: "not-a-boolean",
			};

			mockRepositoryService.updateRepository.mockRejectedValue(
				new ValidationError("is_private", "Must be a boolean"),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/test-repo",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});

		it("should return 400 for empty update request", async () => {
			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/test-repo",
				payload: {},
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});
	});

	describe("DELETE /repositories/:owner/:repoName", () => {
		it("should delete an existing repository successfully", async () => {
			// Arrange
			mockRepositoryService.deleteRepository.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testuser/test-repo",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockRepositoryService.deleteRepository).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
			);
			expect(result.body).toBe("");
		});

		it("should return 404 when deleting non-existent repository", async () => {
			// Arrange
			mockRepositoryService.deleteRepository.mockRejectedValue(
				new EntityNotFoundError(
					"RepositoryEntity",
					"REPO#testuser#nonexistent",
				),
			);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testuser/nonexistent",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body.detail).toContain("not found");
		});
	});

	describe("GET /repositories/owner/:owner", () => {
		it("should list repositories for an owner successfully", async () => {
			// Arrange
			const repos = [
				{
					owner: "testuser",
					repo_name: "repo1",
					description: "First repo",
					is_private: false,
					language: "TypeScript",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					owner: "testuser",
					repo_name: "repo2",
					description: "Second repo",
					is_private: true,
					language: "JavaScript",
					created_at: "2024-01-02T00:00:00.000Z",
					updated_at: "2024-01-02T00:00:00.000Z",
				},
			];

			mockRepositoryService.listRepositoriesByOwner.mockResolvedValue({
				items: repos,
				offset: undefined,
			});

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/testuser",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(
				mockRepositoryService.listRepositoriesByOwner,
			).toHaveBeenCalledWith("testuser", {});
			const body = JSON.parse(result.body);
			expect(body).toEqual({
				items: repos,
				offset: undefined,
			});
		});

		it("should return empty list for owner with no repositories", async () => {
			// Arrange
			mockRepositoryService.listRepositoriesByOwner.mockResolvedValue({
				items: [],
				offset: undefined,
			});

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/emptyuser",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual({
				items: [],
				offset: undefined,
			});
		});

		it("should support pagination with limit and offset", async () => {
			// Arrange
			const repos = [
				{
					owner: "testuser",
					repo_name: "repo1",
					is_private: false,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockRepositoryService.listRepositoriesByOwner.mockResolvedValue({
				items: repos,
				offset: "next-token",
			});

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/testuser?limit=10&offset=prev-token",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(
				mockRepositoryService.listRepositoriesByOwner,
			).toHaveBeenCalledWith("testuser", {
				limit: 10,
				offset: "prev-token",
			});
			const body = JSON.parse(result.body);
			expect(body).toEqual({
				items: repos,
				offset: "next-token",
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle unexpected errors with 500", async () => {
			// Arrange
			mockRepositoryService.getRepository.mockRejectedValue(
				new Error("Unexpected database error"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo",
			});

			// Assert
			expect(result.statusCode).toBe(500);
		});

		it("should include error details in problem detail format", async () => {
			// Arrange
			mockRepositoryService.createRepository.mockRejectedValue(
				new DuplicateEntityError("RepositoryEntity", "REPO#testuser#test-repo"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories",
				payload: {
					owner: "testuser",
					repo_name: "test-repo",
				},
			});

			// Assert
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("type");
			expect(body).toHaveProperty("title");
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("detail");
			expect(body).toHaveProperty("entityType", "RepositoryEntity");
			expect(body).toHaveProperty("pk", "REPO#testuser#test-repo");
		});
	});

	describe("PUT /:owner/:repoName/star", () => {
		it("should star a repository successfully", async () => {
			// Arrange
			const starResponse = {
				username: "starrer",
				repo_owner: "testuser",
				repo_name: "test-repo",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};
			mockRepositoryService.starRepository.mockResolvedValue(starResponse);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/repositories/testuser/test-repo/star",
				payload: {
					username: "starrer",
				},
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockRepositoryService.starRepository).toHaveBeenCalledWith(
				"starrer",
				"testuser",
				"test-repo",
			);
		});
	});

	describe("DELETE /:owner/:repoName/star", () => {
		it("should unstar a repository successfully", async () => {
			// Arrange
			mockRepositoryService.unstarRepository.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testuser/test-repo/star",
				payload: {
					username: "starrer",
				},
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockRepositoryService.unstarRepository).toHaveBeenCalledWith(
				"starrer",
				"testuser",
				"test-repo",
			);
		});
	});

	describe("GET /:owner/:repoName/star", () => {
		it("should check if repository is starred - true", async () => {
			// Arrange
			mockRepositoryService.isStarred.mockResolvedValue(true);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/star?username=starrer",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual({ starred: true });
			expect(mockRepositoryService.isStarred).toHaveBeenCalledWith(
				"starrer",
				"testuser",
				"test-repo",
			);
		});

		it("should check if repository is starred - false", async () => {
			// Arrange
			mockRepositoryService.isStarred.mockResolvedValue(false);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/star?username=starrer",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual({ starred: false });
		});
	});

	describe("POST /:owner/:repoName/forks", () => {
		it("should create a fork successfully", async () => {
			// Arrange
			const forkResponse = {
				original_owner: "testuser",
				original_repo: "test-repo",
				fork_owner: "forker",
				fork_repo: "forked-repo",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};
			mockRepositoryService.createFork.mockResolvedValue(forkResponse);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testuser/test-repo/forks",
				payload: {
					fork_owner: "forker",
					fork_repo: "forked-repo",
				},
			});

			// Assert
			expect(result.statusCode).toBe(201);
			const body = JSON.parse(result.body);
			expect(body).toEqual(forkResponse);
			expect(mockRepositoryService.createFork).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
				"forker",
				"forked-repo",
			);
		});
	});

	describe("GET /:owner/:repoName/forks", () => {
		it("should list forks successfully", async () => {
			// Arrange
			const forks = [
				{
					original_owner: "testuser",
					original_repo: "test-repo",
					fork_owner: "forker1",
					fork_repo: "fork1",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					original_owner: "testuser",
					original_repo: "test-repo",
					fork_owner: "forker2",
					fork_repo: "fork2",
					created_at: "2024-01-02T00:00:00.000Z",
					updated_at: "2024-01-02T00:00:00.000Z",
				},
			];
			mockRepositoryService.listForks.mockResolvedValue(forks);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/forks",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual(forks);
			expect(mockRepositoryService.listForks).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
			);
		});

		it("should return empty array when no forks exist", async () => {
			// Arrange
			mockRepositoryService.listForks.mockResolvedValue([]);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/forks",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual([]);
		});
	});

	describe("GET /:owner/:repoName/forks/:forkOwner", () => {
		it("should get a specific fork successfully", async () => {
			// Arrange
			const fork = {
				original_owner: "testuser",
				original_repo: "test-repo",
				fork_owner: "forker",
				fork_repo: "test-repo",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};
			mockRepositoryService.getFork.mockResolvedValue(fork);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/forks/forker",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual(fork);
			expect(mockRepositoryService.getFork).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
				"forker",
				"test-repo",
			);
		});

		it("should return 404 when fork not found", async () => {
			// Arrange
			mockRepositoryService.getFork.mockRejectedValue(
				new EntityNotFoundError("ForkEntity", "FORK#testuser#test-repo#forker"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testuser/test-repo/forks/forker",
			});

			// Assert
			expect(result.statusCode).toBe(404);
		});
	});

	describe("DELETE /:owner/:repoName/forks/:forkOwner", () => {
		it("should delete a fork successfully", async () => {
			// Arrange
			mockRepositoryService.deleteFork.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testuser/test-repo/forks/forker",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockRepositoryService.deleteFork).toHaveBeenCalledWith(
				"testuser",
				"test-repo",
				"forker",
				"test-repo",
			);
		});
	});
});
