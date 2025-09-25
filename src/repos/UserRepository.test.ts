import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UserRepository } from "./UserRepository";
import { UserEntity } from "../services";
import { initializeSchema } from "./schema";
import {
  DuplicateEntityError,
  EntityNotFoundError,
  ValidationError,
} from "../shared";
import { createUserEntity } from "../services/entities/fixtures";

describe("UserRepository", () => {
  const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "local",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });
  const { table, user } = initializeSchema(client);
  const userRepository = new UserRepository(table, user);

  it("should create a new user successfully", async () => {
    const user = createUserEntity();

    const createdUser = await userRepository.createUser(user);

    expect(createdUser.username).toBe(user.username);
    expect(createdUser.email).toBe(user.email);
    expect(createdUser.bio).toBe(user.bio);
    expect(createdUser.created).toBeDefined();
    expect(createdUser.modified).toBeDefined();

    await userRepository.deleteUser(createdUser.username);
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

      await userRepository.createUser(user1);
      await expect(userRepository.createUser(user2)).rejects.toThrow(
        DuplicateEntityError,
      );
      await expect(userRepository.createUser(user2)).rejects.toThrow(
        "already exists",
      );
      await userRepository.deleteUser(user1.username);
    });

    it("should throw ValidationError for invalid user data", async () => {
      const user = createUserEntity({
        username: "invalid@user",
        email: "invalid-email",
      });

      await expect(userRepository.createUser(user)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("listUsers", () => {
    it("should list users with default pagination", async () => {
      // Create multiple users
      const users = [
        createUserEntity({ username: "user1", email: "user1@example.com" }),
        createUserEntity({ username: "user2", email: "user2@example.com" }),
        createUserEntity({ username: "user3", email: "user3@example.com" }),
      ];

      for (const user of users) {
        await userRepository.createUser(user);
      }

      const result = await userRepository.listUsers();

      expect(result.items).toHaveLength(3);
      expect(result.items.every((item) => item instanceof UserEntity)).toBe(
        true,
      );

      await Promise.all(
        users.map((user) => userRepository.deleteUser(user.username)),
      );
    });

    it("should respect limit parameter", async () => {
      // Create multiple users
      const users = [
        createUserEntity({
          username: "limituser1",
          email: "limituser1@example.com",
        }),
        createUserEntity({
          username: "limituser2",
          email: "limituser2@example.com",
        }),
        createUserEntity({
          username: "limituser3",
          email: "limituser3@example.com",
        }),
      ];

      for (const user of users) {
        await userRepository.createUser(user);
      }

      const page1 = await userRepository.listUsers(2);
      expect(page1.items).toHaveLength(2);

      const page2 = await userRepository.listUsers(2, page1.offset);
      expect(page2.items).toHaveLength(1);

      await Promise.all(
        users.map((user) => userRepository.deleteUser(user.username)),
      );
    });

    it("should return empty list when no users exist", async () => {
      const result = await userRepository.listUsers();

      expect(result.items).toHaveLength(0);
      expect(result.offset).toBeUndefined();
    });
  });

  describe("getUser", () => {
    it("should retrieve an existing user", async () => {
      const originalUser = createUserEntity({
        username: "getuser",
        email: "get@example.com",
        bio: "Get user bio",
      });

      await userRepository.createUser(originalUser);
      const retrievedUser = await userRepository.getUser("getuser");

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser!.username).toBe(originalUser.username);
      expect(retrievedUser!.email).toBe(originalUser.email);
      expect(retrievedUser!.bio).toBe(originalUser.bio);
    });

    it("should return null for non-existent user", async () => {
      const user = await userRepository.getUser("nonexistent");
      expect(user).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update an existing user", async () => {
      const originalUser = createUserEntity({
        username: "updateuser",
        email: "original@example.com",
        bio: "Original bio",
      });

      const createdUser = await userRepository.createUser(originalUser);

      const updatedUser = createdUser.updateUser({
        email: "updated@example.com",
        bio: "Updated bio",
        paymentPlanId: "pro",
      });

      const result = await userRepository.updateUser(updatedUser);

      expect(result.username).toBe(updatedUser.username);
      expect(result.email).toBe(updatedUser.email);
      expect(result.bio).toBe(updatedUser.bio);
      expect(result.paymentPlanId).toBe(updatedUser.paymentPlanId);
      expect(result.modified).not.toBe(originalUser.modified);
    });

    it("should throw EntityNotFoundError for non-existent user", async () => {
      const user = createUserEntity({
        username: "nonexistent",
        email: "nonexistent@example.com",
      });

      await expect(userRepository.updateUser(user)).rejects.toThrow(
        EntityNotFoundError,
      );
    });
  });
});
