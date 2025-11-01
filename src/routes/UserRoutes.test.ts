import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type { OrganizationService, RepositoryService } from "../services";
import type { UserService } from "../services/UserService";
import type { UserCreateRequest, UserUpdateRequest } from "./schema";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

describe("UserRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockUserService = jest.mocked<UserService>({
		createUser: jest.fn(),
		getUser: jest.fn(),
		updateUser: jest.fn(),
		deleteUser: jest.fn(),
	} as unknown as UserService);
	const mockServices = {
		userService: mockUserService,
		organizationService: {} as unknown as OrganizationService,
		repositoryService: {} as unknown as RepositoryService,
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

	describe("POST /users", () => {
		it("should create a new user successfully", async () => {
			// Arrange
			const request: UserCreateRequest = {
				username: "testuser",
				email: "test@example.com",
				bio: "Test bio",
				payment_plan_id: "free",
			};

			const response = {
				username: "testuser",
				email: "test@example.com",
				bio: "Test bio",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockUserService.createUser.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/users",
				payload: request,
			});

			// Assert
			expect(result.statusCode).toBe(201);
			expect(mockUserService.createUser).toHaveBeenCalledWith(request);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 409 when username already exists", async () => {
			// Arrange
			const request: UserCreateRequest = {
				username: "existinguser",
				email: "test@example.com",
			};

			mockUserService.createUser.mockRejectedValue(
				new DuplicateEntityError("UserEntity", "existinguser"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/users",
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
				username: "invalid@user",
				email: "invalid-email",
			};

			mockUserService.createUser.mockRejectedValue(
				new ValidationError("email", "Invalid email format"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/users",
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
				username: "testuser",
				// missing email
			};

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/users",
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
				url: "/v1/users",
				payload: "invalid-json-string",
				headers: {
					"content-type": "text/plain",
				},
			});

			// Assert
			expect(result.statusCode).toBe(400);
		});
	});

	describe("GET /users/:username", () => {
		it("should retrieve an existing user", async () => {
			// Arrange
			const response = {
				username: "testuser",
				email: "test@example.com",
				bio: "Test bio",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockUserService.getUser.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/users/testuser",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockUserService.getUser).toHaveBeenCalledWith("testuser");
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 for non-existent user", async () => {
			// Arrange
			mockUserService.getUser.mockRejectedValue(
				new EntityNotFoundError("UserEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/users/nonexistent",
			});

			// Assert
			expect(result.statusCode).toBe(404);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 404);
			expect(body).toHaveProperty("title", "Not Found");
			expect(body.detail).toContain("not found");
		});

		it("should handle username with special characters", async () => {
			// Arrange
			const response = {
				username: "test-user_123",
				email: "test@example.com",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockUserService.getUser.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/users/test-user_123",
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockUserService.getUser).toHaveBeenCalledWith("test-user_123");
		});
	});

	describe("PUT /users/:username", () => {
		it("should update an existing user successfully", async () => {
			// Arrange
			const updateRequest: UserUpdateRequest = {
				email: "updated@example.com",
				bio: "Updated bio",
				payment_plan_id: "pro",
			};

			const response = {
				username: "testuser",
				email: "updated@example.com",
				bio: "Updated bio",
				payment_plan_id: "pro",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockUserService.updateUser.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/users/testuser",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockUserService.updateUser).toHaveBeenCalledWith(
				"testuser",
				updateRequest,
			);
			const body = JSON.parse(result.body);
			expect(body).toEqual(response);
		});

		it("should return 404 when updating non-existent user", async () => {
			// Arrange
			const updateRequest: UserUpdateRequest = {
				email: "updated@example.com",
			};

			mockUserService.updateUser.mockRejectedValue(
				new EntityNotFoundError("UserEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/users/nonexistent",
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
			const updateRequest: UserUpdateRequest = {
				bio: "Updated bio only",
			};

			const response = {
				username: "testuser",
				email: "test@example.com",
				bio: "Updated bio only",
				payment_plan_id: "free",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
			};

			mockUserService.updateUser.mockResolvedValue(response);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/users/testuser",
				payload: updateRequest,
			});

			// Assert
			expect(result.statusCode).toBe(200);
			expect(mockUserService.updateUser).toHaveBeenCalledWith(
				"testuser",
				updateRequest,
			);
		});

		it("should return 400 for validation errors", async () => {
			// Arrange
			const updateRequest = {
				email: "invalid-email",
			};

			mockUserService.updateUser.mockRejectedValue(
				new ValidationError("email", "Invalid email format"),
			);

			// Act
			const result = await app.inject({
				method: "PUT",
				url: "/v1/users/testuser",
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
				url: "/v1/users/testuser",
				payload: {},
			});

			// Assert
			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("status", 400);
		});
	});

	describe("DELETE /users/:username", () => {
		it("should delete an existing user successfully", async () => {
			// Arrange
			mockUserService.deleteUser.mockResolvedValue(undefined);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/users/testuser",
			});

			// Assert
			expect(result.statusCode).toBe(204);
			expect(mockUserService.deleteUser).toHaveBeenCalledWith("testuser");
			expect(result.body).toBe("");
		});

		it("should return 404 when deleting non-existent user", async () => {
			// Arrange
			mockUserService.deleteUser.mockRejectedValue(
				new EntityNotFoundError("UserEntity", "nonexistent"),
			);

			// Act
			const result = await app.inject({
				method: "DELETE",
				url: "/v1/users/nonexistent",
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
			mockUserService.getUser.mockRejectedValue(
				new Error("Unexpected database error"),
			);

			// Act
			const result = await app.inject({
				method: "GET",
				url: "/v1/users/testuser",
			});

			// Assert
			expect(result.statusCode).toBe(500);
		});

		it("should include error details in problem detail format", async () => {
			// Arrange
			mockUserService.createUser.mockRejectedValue(
				new DuplicateEntityError("UserEntity", "testuser"),
			);

			// Act
			const result = await app.inject({
				method: "POST",
				url: "/v1/users",
				payload: {
					username: "testuser",
					email: "test@example.com",
				},
			});

			// Assert
			const body = JSON.parse(result.body);
			expect(body).toHaveProperty("type");
			expect(body).toHaveProperty("title");
			expect(body).toHaveProperty("status");
			expect(body).toHaveProperty("detail");
			expect(body).toHaveProperty("entityType", "UserEntity");
			expect(body).toHaveProperty("pk", "testuser");
		});
	});
});
