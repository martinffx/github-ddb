import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type {
	OrganizationService,
	RepositoryService,
	UserService,
} from "../services";
import type { IssueService } from "../services/IssueService";
import type { IssueCreateRequest, IssueUpdateRequest } from "./schema";
import { EntityNotFoundError, ValidationError } from "../shared";

describe("IssueRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockIssueService = jest.mocked<IssueService>({
		createIssue: jest.fn(),
		getIssue: jest.fn(),
		listIssues: jest.fn(),
		updateIssue: jest.fn(),
		deleteIssue: jest.fn(),
	} as unknown as IssueService);
	const mockServices = {
		userService: {} as unknown as UserService,
		organizationService: {} as unknown as OrganizationService,
		repositoryService: {} as unknown as RepositoryService,
		issueService: mockIssueService,
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

	describe("POST /v1/repositories/:owner/:repoName/issues", () => {
		it("should create a new issue successfully", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: ["user1", "user2"],
				labels: ["bug", "urgent"],
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				issue_number: 1,
				title: "Test Issue",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: ["user1", "user2"],
				labels: ["bug", "urgent"],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockIssueService.createIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			expect(mockIssueService.createIssue).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				request,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
			expect(body.issue_number).toBe(1);
		});

		it("should create issue with default status when not provided", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				author: "testuser",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				issue_number: 1,
				title: "Test Issue",
				status: "open",
				author: "testuser",
				assignees: [],
				labels: [],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockIssueService.createIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			const body = JSON.parse(result.body);
			expect(body.status).toBe("open");
		});

		it("should return 400 when repository does not exist", async () => {
			// Arrange
			const request: IssueCreateRequest = {
				title: "Test Issue",
				author: "testuser",
			};

			mockIssueService.createIssue.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
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
				// missing title and author
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
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
				title: "Test Issue",
				author: "testuser",
				status: "invalid",
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/issues/:issueNumber", () => {
		it("should retrieve an existing issue", async () => {
			// Arrange
			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				issue_number: 1,
				title: "Test Issue",
				body: "Test body",
				status: "open",
				author: "testuser",
				assignees: ["user1"],
				labels: ["bug"],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockIssueService.getIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues/1",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockIssueService.getIssue).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 for non-existent issue", async () => {
			// Arrange
			mockIssueService.getIssue.mockRejectedValue(
				new EntityNotFoundError("IssueEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues/999",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body).toHaveProperty("title", "Not Found");
			expect(body.detail).toContain("not found");
		});

		it("should return 400 for invalid issue number", async () => {
			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues/invalid",
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/issues", () => {
		it("should list all issues when no status filter provided", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					issue_number: 1,
					title: "Issue 1",
					status: "open",
					author: "user1",
					assignees: [],
					labels: [],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
				{
					owner: "testowner",
					repo_name: "testrepo",
					issue_number: 2,
					title: "Issue 2",
					status: "closed",
					author: "user2",
					assignees: [],
					labels: [],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockIssueService.listIssues.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockIssueService.listIssues).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				undefined,
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(2);
		});

		it("should list only open issues when status filter is 'open'", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					issue_number: 1,
					title: "Issue 1",
					status: "open",
					author: "user1",
					assignees: [],
					labels: [],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockIssueService.listIssues.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues?status=open",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockIssueService.listIssues).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"open",
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(1);
			expect(body[0].status).toBe("open");
		});

		it("should list only closed issues when status filter is 'closed'", async () => {
			// Arrange
			const response = [
				{
					owner: "testowner",
					repo_name: "testrepo",
					issue_number: 2,
					title: "Issue 2",
					status: "closed",
					author: "user2",
					assignees: [],
					labels: [],
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z",
				},
			];

			mockIssueService.listIssues.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues?status=closed",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockIssueService.listIssues).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				"closed",
			);
			const body = JSON.parse(result.body);
			expect(body).toHaveLength(1);
			expect(body[0].status).toBe("closed");
		});

		it("should return empty array when no issues exist", async () => {
			// Arrange
			mockIssueService.listIssues.mockResolvedValue([]);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues",
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
				url: "/v1/repositories/testowner/testrepo/issues?status=invalid",
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("PATCH /v1/repositories/:owner/:repoName/issues/:issueNumber", () => {
		it("should update an existing issue successfully", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
				assignees: ["newuser"],
				labels: ["resolved"],
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				issue_number: 1,
				title: "Updated Title",
				body: "Updated body",
				status: "closed",
				author: "testuser",
				assignees: ["newuser"],
				labels: ["resolved"],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T01:00:00.000Z",
			};

			mockIssueService.updateIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/issues/1",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockIssueService.updateIssue).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
				updateRequest,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 when updating non-existent issue", async () => {
			// Arrange
			const updateRequest: IssueUpdateRequest = {
				title: "Updated Title",
			};

			mockIssueService.updateIssue.mockRejectedValue(
				new EntityNotFoundError("IssueEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/issues/999",
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
			const updateRequest: IssueUpdateRequest = {
				status: "closed",
			};

			const response = {
				owner: "testowner",
				repo_name: "testrepo",
				issue_number: 1,
				title: "Original Title",
				body: "Original body",
				status: "closed",
				author: "testuser",
				assignees: ["user1"],
				labels: ["bug"],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T01:00:00.000Z",
			};

			mockIssueService.updateIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/issues/1",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body.status).toBe("closed");
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const updateRequest = {
				title: "", // Invalid: empty title
			};

			mockIssueService.updateIssue.mockRejectedValue(
				new ValidationError("title", "Title is required"),
			);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/issues/1",
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
				issue_number: 1,
				title: "Original Title",
				body: "Original body",
				status: "open",
				author: "testuser",
				assignees: ["user1"],
				labels: ["bug"],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockIssueService.updateIssue.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PATCH",
				url: "/v1/repositories/testowner/testrepo/issues/1",
				payload: {},
			});

			// Assert - Empty payload is valid for PATCH (no-op update)
			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});
	});

	describe("DELETE /v1/repositories/:owner/:repoName/issues/:issueNumber", () => {
		it("should delete an existing issue successfully", async () => {
			// Arrange
			mockIssueService.deleteIssue.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testowner/testrepo/issues/1",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockIssueService.deleteIssue).toHaveBeenCalledWith(
				"testowner",
				"testrepo",
				1,
			);
			expect(result.body).toBe("");
		});

		it("should return 404 when deleting non-existent issue", async () => {
			// Arrange
			mockIssueService.deleteIssue.mockRejectedValue(
				new EntityNotFoundError("IssueEntity", "999"),
			);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/testowner/testrepo/issues/999",
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
			mockIssueService.getIssue.mockRejectedValue(
				new Error("Unexpected database error"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/repositories/testowner/testrepo/issues/1",
			});

			// Assert
			expect(result.statusCode).toBe(500);
		});

		it("should include error details in problem detail format", async () => {
			// Arrange
			mockIssueService.createIssue.mockRejectedValue(
				new ValidationError(
					"repository",
					"Repository 'testowner/testrepo' does not exist",
				),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/repositories/testowner/testrepo/issues",
				payload: {
					title: "Test Issue",
					author: "testuser",
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
