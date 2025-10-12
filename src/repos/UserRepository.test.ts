import { UserRepository } from "./UserRepository";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import {
	createUserEntity,
	createGithubSchema,
} from "../services/entities/fixtures";

describe("UserRepository", () => {
	let userRepo: UserRepository;

	beforeAll(async () => {
		const { user } = await createGithubSchema();
		userRepo = new UserRepository(user);
	});

	it("should create a new user successfully", async () => {
		const user = createUserEntity();

		const createdUser = await userRepo.createUser(user);

		expect(createdUser.username).toBe(user.username);
		expect(createdUser.email).toBe(user.email);
		expect(createdUser.bio).toBe(user.bio);
		expect(createdUser.created).toBeDefined();
		expect(createdUser.modified).toBeDefined();

		await userRepo.deleteUser(createdUser.username);
	});

	describe("createUser", () => {
		it("should throw DuplicateEntityError for duplicate username", async () => {
			const user1 = createUserEntity({
				username: "duplicateuser",
				email: "user1@example.com",
			});

			const user2 = createUserEntity({
				username: "duplicateuser",
				email: "user2@example.com",
			});

			await userRepo.createUser(user1);
			await expect(userRepo.createUser(user2)).rejects.toThrow(
				DuplicateEntityError,
			);
			await expect(userRepo.createUser(user2)).rejects.toThrow(
				"already exists",
			);
			await userRepo.deleteUser(user1.username);
		});

		it("should throw ValidationError for invalid user data", async () => {
			const user = createUserEntity({
				username: "invalid@user",
				email: "invalid-email",
			});

			await expect(userRepo.createUser(user)).rejects.toThrow(ValidationError);
		});
	});

	describe("getUser", () => {
		it("should retrieve an existing user", async () => {
			const originalUser = createUserEntity({
				username: "getuser",
				email: "get@example.com",
				bio: "Get user bio",
			});

			await userRepo.createUser(originalUser);
			const retrievedUser = await userRepo.getUser("getuser");

			expect(retrievedUser).not.toBeNull();
			if (!retrievedUser) throw new Error("User should not be null");
			expect(retrievedUser.username).toBe(originalUser.username);
			expect(retrievedUser.email).toBe(originalUser.email);
			expect(retrievedUser.bio).toBe(originalUser.bio);

			await userRepo.deleteUser("getuser");
		});

		it("should return null for non-existent user", async () => {
			const user = await userRepo.getUser("nonexistent");
			expect(user).toBeUndefined();
		});
	});

	describe("updateUser", () => {
		it("should update an existing user", async () => {
			const originalUser = createUserEntity({
				username: "updateuser",
				email: "original@example.com",
				bio: "Original bio",
			});

			const createdUser = await userRepo.createUser(originalUser);

			const updatedUser = createdUser.updateUser({
				email: "updated@example.com",
				bio: "Updated bio",
				paymentPlanId: "pro",
			});

			const result = await userRepo.updateUser(updatedUser);

			expect(result.username).toBe(updatedUser.username);
			expect(result.email).toBe(updatedUser.email);
			expect(result.bio).toBe(updatedUser.bio);
			expect(result.paymentPlanId).toBe(updatedUser.paymentPlanId);
			expect(result.modified).not.toBe(originalUser.modified);

			await userRepo.deleteUser("updateuser");
		});

		it("should throw EntityNotFoundError for non-existent user", async () => {
			const user = createUserEntity({
				username: "nonexistent",
				email: "nonexistent@example.com",
			});

			await expect(userRepo.updateUser(user)).rejects.toThrow(
				EntityNotFoundError,
			);
		});
	});
});
