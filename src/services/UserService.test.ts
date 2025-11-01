import { UserService } from "./UserService";
import type { UserRepository } from "../repos";
import { UserEntity } from "./entities";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import type { UserCreateRequest, UserUpdateRequest } from "../routes/schema";

describe("UserService", () => {
	const mockUserRepo = jest.mocked<UserRepository>({
		createUser: jest.fn(),
		getUser: jest.fn(),
		updateUser: jest.fn(),
		deleteUser: jest.fn(),
	} as unknown as UserRepository);
	const userService = new UserService(mockUserRepo);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createUser", () => {
		it("should create a new user successfully", async () => {
			// Arrange
			const request: UserCreateRequest = {
				username: "testuser",
				email: "test@example.com",
				bio: "Test bio",
				payment_plan_id: "free",
			};

			const mockEntity = UserEntity.fromRequest(request);
			mockUserRepo.createUser.mockResolvedValue(mockEntity);

			// Act
			const result = await userService.createUser(request);

			// Assert
			expect(mockUserRepo.createUser).toHaveBeenCalledTimes(1);
			expect(mockUserRepo.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					username: request.username,
					email: request.email,
					bio: request.bio,
					paymentPlanId: request.payment_plan_id,
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.username).toBe(request.username);
			expect(result.email).toBe(request.email);
		});

		it("should throw DuplicateEntityError when username already exists", async () => {
			// Arrange
			const request: UserCreateRequest = {
				username: "existinguser",
				email: "existing@example.com",
			};

			mockUserRepo.createUser.mockRejectedValue(
				new DuplicateEntityError("UserEntity", request.username),
			);

			// Act & Assert
			await expect(userService.createUser(request)).rejects.toThrow(
				DuplicateEntityError,
			);
			await expect(userService.createUser(request)).rejects.toThrow(
				"already exists",
			);
		});

		it("should throw ValidationError for invalid user data", async () => {
			// Arrange
			const request: UserCreateRequest = {
				username: "invalid@user",
				email: "invalid-email",
			};

			mockUserRepo.createUser.mockRejectedValue(
				new ValidationError("email", "Invalid email format"),
			);

			// Act & Assert
			await expect(userService.createUser(request)).rejects.toThrow(
				ValidationError,
			);
		});
	});

	describe("getUser", () => {
		it("should retrieve an existing user", async () => {
			// Arrange
			const mockEntity = new UserEntity({
				username: "testuser",
				email: "test@example.com",
				bio: "Test bio",
			});

			mockUserRepo.getUser.mockResolvedValue(mockEntity);

			// Act
			const result = await userService.getUser("testuser");

			// Assert
			expect(mockUserRepo.getUser).toHaveBeenCalledWith("testuser");
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.username).toBe("testuser");
		});

		it("should throw EntityNotFoundError for non-existent user", async () => {
			// Arrange
			mockUserRepo.getUser.mockResolvedValue(undefined);

			// Act & Assert
			await expect(userService.getUser("nonexistent")).rejects.toThrow(
				EntityNotFoundError,
			);
			await expect(userService.getUser("nonexistent")).rejects.toThrow(
				"not found",
			);
		});
	});

	describe("updateUser", () => {
		it("should update an existing user successfully", async () => {
			// Arrange
			const username = "testuser";
			const updateRequest: UserUpdateRequest = {
				email: "updated@example.com",
				bio: "Updated bio",
				payment_plan_id: "pro",
			};

			const existingEntity = new UserEntity({
				username,
				email: "old@example.com",
				bio: "Old bio",
			});

			const updatedEntity = existingEntity.updateUser({
				email: updateRequest.email,
				bio: updateRequest.bio,
				paymentPlanId: updateRequest.payment_plan_id,
			});

			mockUserRepo.getUser.mockResolvedValue(existingEntity);
			mockUserRepo.updateUser.mockResolvedValue(updatedEntity);

			// Act
			const result = await userService.updateUser(username, updateRequest);

			// Assert
			expect(mockUserRepo.getUser).toHaveBeenCalledWith(username);
			expect(mockUserRepo.updateUser).toHaveBeenCalledTimes(1);
			expect(mockUserRepo.updateUser).toHaveBeenCalledWith(
				expect.objectContaining({
					username,
					email: updateRequest.email,
					bio: updateRequest.bio,
					paymentPlanId: updateRequest.payment_plan_id,
				}),
			);
			expect(result.email).toBe(updateRequest.email);
			expect(result.bio).toBe(updateRequest.bio);
			expect(result.payment_plan_id).toBe(updateRequest.payment_plan_id);
		});

		it("should throw EntityNotFoundError when user does not exist", async () => {
			// Arrange
			const username = "nonexistent";
			const updateRequest: UserUpdateRequest = {
				email: "updated@example.com",
			};

			mockUserRepo.getUser.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				userService.updateUser(username, updateRequest),
			).rejects.toThrow(EntityNotFoundError);
		});

		it("should allow partial updates", async () => {
			// Arrange
			const username = "testuser";
			const updateRequest: UserUpdateRequest = {
				bio: "Updated bio only",
			};

			const existingEntity = new UserEntity({
				username,
				email: "test@example.com",
				bio: "Old bio",
				paymentPlanId: "free",
			});

			const updatedEntity = existingEntity.updateUser({
				bio: updateRequest.bio,
			});

			mockUserRepo.getUser.mockResolvedValue(existingEntity);
			mockUserRepo.updateUser.mockResolvedValue(updatedEntity);

			// Act
			const result = await userService.updateUser(username, updateRequest);

			// Assert
			expect(result.email).toBe(existingEntity.email); // Should be unchanged
			expect(result.bio).toBe(updateRequest.bio);
			expect(result.payment_plan_id).toBe(existingEntity.paymentPlanId);
		});
	});

	describe("deleteUser", () => {
		it("should delete an existing user successfully", async () => {
			// Arrange
			const username = "testuser";
			const existingEntity = new UserEntity({
				username,
				email: "test@example.com",
			});

			mockUserRepo.getUser.mockResolvedValue(existingEntity);
			mockUserRepo.deleteUser.mockResolvedValue(undefined);

			// Act
			await userService.deleteUser(username);

			// Assert
			expect(mockUserRepo.getUser).toHaveBeenCalledWith(username);
			expect(mockUserRepo.deleteUser).toHaveBeenCalledWith(username);
		});

		it("should throw EntityNotFoundError when user does not exist", async () => {
			// Arrange
			const username = "nonexistent";
			mockUserRepo.getUser.mockResolvedValue(undefined);

			// Act & Assert
			await expect(userService.deleteUser(username)).rejects.toThrow(
				EntityNotFoundError,
			);
			expect(mockUserRepo.deleteUser).not.toHaveBeenCalled();
		});
	});
});
