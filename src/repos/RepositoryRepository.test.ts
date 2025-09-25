import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";
import { OrganizationRepository } from "./OrganizationRepository";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import {
  createRepositoryEntity,
  createUserEntity,
} from "../services/entities/fixtures";
import { ValidationError, DuplicateEntityError } from "../shared";
import { initializeSchema } from "./schema";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

describe("RepositoryRepository", () => {
  const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
  });
  const { table, repository, user, organization } = initializeSchema(client);
  const repositoryRepo = new RepoRepository(table, repository);
  const userRepo = new UserRepository(table, user);
  const orgRepo = new OrganizationRepository(table, organization);

  it("should create a new repository with user owner", async () => {
    // Create user first
    const testUser = createUserEntity({ username: "testuser" });
    await userRepo.create(testUser);

    const repoEntity = createRepositoryEntity({
      owner: "testuser",
      repo_name: "test-repo",
    });

    const result = await repositoryRepo.create(repoEntity);
    expect(result).toBeInstanceOf(RepositoryEntity);
    expect(result.owner).toBe("testuser");
    expect(result.repo_name).toBe("test-repo");
  });

  it("should create a new repository with organization owner", async () => {
    // Create organization first
    const testOrg = new OrganizationEntity({
      org_name: "testorg",
      description: "Test organization",
    });
    await orgRepo.create(testOrg);

    const repoEntity = createRepositoryEntity({
      owner: "testorg",
      repo_name: "org-repo",
      is_private: true,
    });

    const result = await repositoryRepo.create(repoEntity);
    expect(result).toBeInstanceOf(RepositoryEntity);
    expect(result.owner).toBe("testorg");
    expect(result.repo_name).toBe("org-repo");
  });

  it("should throw ValidationError when owner does not exist", async () => {
    const repoEntity = createRepositoryEntity({
      owner: "nonexistent",
      repo_name: "test-repo",
    });

    await expect(repositoryRepo.create(repoEntity)).rejects.toThrow(
      ValidationError,
    );
  });

  it("should throw DuplicateEntityError for duplicate repository", async () => {
    // Create user first
    const testUser = createUserEntity({ username: "testuser" });
    await userRepo.create(testUser);

    const repoEntity = createRepositoryEntity({
      owner: "testuser",
      repo_name: "test-repo",
    });

    await repositoryRepo.create(repoEntity);
    await expect(repositoryRepo.create(repoEntity)).rejects.toThrow(
      DuplicateEntityError,
    );
  });

  it("should get an existing repository", async () => {
    // Create user and repository
    const testUser = createUserEntity({ username: "testuser" });
    await userRepo.create(testUser);

    const repoEntity = createRepositoryEntity({
      owner: "testuser",
      repo_name: "test-repo",
    });
    await repositoryRepo.create(repoEntity);

    const result = await repositoryRepo.get({
      owner: "testuser",
      repo_name: "test-repo",
    });

    expect(result).toBeInstanceOf(RepositoryEntity);
    expect(result?.owner).toBe("testuser");
    expect(result?.repo_name).toBe("test-repo");
  });

  it("should return null for non-existent repository", async () => {
    const result = await repositoryRepo.get({
      owner: "nonexistent",
      repo_name: "nonexistent",
    });

    expect(result).toBeNull();
  });

  it("should list repositories by owner", async () => {
    // Create user and repositories
    const testUser = createUserEntity({ username: "testuser" });
    await userRepo.create(testUser);

    const repo1 = createRepositoryEntity({
      owner: "testuser",
      repo_name: "repo1",
      is_private: false,
    });
    const repo2 = createRepositoryEntity({
      owner: "testuser",
      repo_name: "repo2",
      is_private: true,
    });

    await repositoryRepo.create(repo1);
    await repositoryRepo.create(repo2);

    const result = await repositoryRepo.listByOwner("testuser");

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toBeInstanceOf(RepositoryEntity);
    expect(result.items.every((repo) => repo.owner === "testuser")).toBe(true);

    // Clean up
    await repositoryRepo.delete({ owner: "testuser", repo_name: "repo1" });
    await repositoryRepo.delete({ owner: "testuser", repo_name: "repo2" });
  });
});
