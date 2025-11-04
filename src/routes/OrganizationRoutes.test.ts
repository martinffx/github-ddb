import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type {
	RepositoryService,
	UserService,
	IssueService,
	PullRequestService,
} from "../services";
import type { OrganizationService } from "../services/OrganizationService";
import type {
	OrganizationCreateRequest,
	OrganizationUpdateRequest,
} from "./schema";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

describe("OrganizationRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockOrganizationService = jest.mocked<OrganizationService>({
		createOrganization: jest.fn(),
		getOrganization: jest.fn(),
		updateOrganization: jest.fn(),
		deleteOrganization: jest.fn(),
	} as unknown as OrganizationService);
	const mockServices = {
		organizationService: mockOrganizationService,
		userService: {} as unknown as UserService,
		repositoryService: {} as unknown as RepositoryService,
		issueService: {} as unknown as IssueService,
		pullRequestService: {} as unknown as PullRequestService,
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

	describe("POST /organizations", () => {
		it("should create a new organization successfully", async () => {
			// Arrange
			const request: OrganizationCreateRequest = {
				org_name: "testorg",
				description: "Test organization",
				payment_plan_id: "free",
			};

			const response = {
				org_name: "testorg",
				description: "Test organization",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockOrganizationService.createOrganization.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/organizations",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
				request,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 409 when org_name already exists", async () => {
			// Arrange
			const request: OrganizationCreateRequest = {
				org_name: "existingorg",
				description: "Test organization",
			};

			mockOrganizationService.createOrganization.mockRejectedValue(
				new DuplicateEntityError("OrganizationEntity", "existingorg"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/organizations",
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
				org_name: "invalid@org",
				description: "Test organization",
			};

			mockOrganizationService.createOrganization.mockRejectedValue(
				new ValidationError("org_name", "Invalid organization name format"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/organizations",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
			expect(body).toHaveProperty("title", "Bad Request");
		});

		it("should return 400 for missing required fields", async () => {
			// Arrange
			const request = {
				description: "Test organization",
				// missing org_name
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/organizations",
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
				url: "/v1/organizations",
				payload: "invalid-json-string",
				headers: {
					"content-type": "text/plain",
				},
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /organizations/:orgName", () => {
		it("should retrieve an existing organization", async () => {
			// Arrange
			const response = {
				org_name: "testorg",
				description: "Test organization",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockOrganizationService.getOrganization.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/organizations/testorg",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockOrganizationService.getOrganization).toHaveBeenCalledWith(
				"testorg",
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 for non-existent organization", async () => {
			// Arrange
			mockOrganizationService.getOrganization.mockRejectedValue(
				new EntityNotFoundError("OrganizationEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/organizations/nonexistent",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body).toHaveProperty("title", "Not Found");
			expect(body.detail).toContain("not found");
		});

		it("should handle org_name with special characters", async () => {
			// Arrange
			const response = {
				org_name: "test-org_123",
				description: "Test organization",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockOrganizationService.getOrganization.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/organizations/test-org_123",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockOrganizationService.getOrganization).toHaveBeenCalledWith(
				"test-org_123",
			);
		});
	});

	describe("PUT /organizations/:orgName", () => {
		it("should update an existing organization successfully", async () => {
			// Arrange
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description",
				payment_plan_id: "pro",
			};

			const response = {
				org_name: "testorg",
				description: "Updated description",
				payment_plan_id: "pro",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockOrganizationService.updateOrganization.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/organizations/testorg",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockOrganizationService.updateOrganization).toHaveBeenCalledWith(
				"testorg",
				updateRequest,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 when updating non-existent organization", async () => {
			// Arrange
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description",
			};

			mockOrganizationService.updateOrganization.mockRejectedValue(
				new EntityNotFoundError("OrganizationEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/organizations/nonexistent",
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
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description only",
			};

			const response = {
				org_name: "testorg",
				description: "Updated description only",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockOrganizationService.updateOrganization.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/organizations/testorg",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockOrganizationService.updateOrganization).toHaveBeenCalledWith(
				"testorg",
				updateRequest,
			);
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const updateRequest = {
				description: "Updated description",
			};

			mockOrganizationService.updateOrganization.mockRejectedValue(
				new ValidationError("description", "Invalid description format"),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/organizations/testorg",
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
				url: "/v1/organizations/testorg",
				payload: {},
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});
	});

	describe("DELETE /organizations/:orgName", () => {
		it("should delete an existing organization successfully", async () => {
			// Arrange
			mockOrganizationService.deleteOrganization.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/organizations/testorg",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockOrganizationService.deleteOrganization).toHaveBeenCalledWith(
				"testorg",
			);
			expect(result.body).toBe("");
		});

		it("should return 404 when deleting non-existent organization", async () => {
			// Arrange
			mockOrganizationService.deleteOrganization.mockRejectedValue(
				new EntityNotFoundError("OrganizationEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/organizations/nonexistent",
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
			mockOrganizationService.getOrganization.mockRejectedValue(
				new Error("Unexpected database error"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/organizations/testorg",
			});

			// Assert
			expect(result.statusCode).toBe(500);
		});

		it("should include error details in problem detail format", async () => {
			// Arrange
			mockOrganizationService.createOrganization.mockRejectedValue(
				new DuplicateEntityError("OrganizationEntity", "testorg"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/organizations",
				payload: {
					org_name: "testorg",
					description: "Test organization",
				},
			});

			// Assert
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("type");
			expect(body).toHaveProperty("title");
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("detail");
			expect(body).toHaveProperty("entityType", "OrganizationEntity");
			expect(body).toHaveProperty("pk", "testorg");
		});
	});
});
