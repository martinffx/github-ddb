import {
	cleanupDDBClient,
	createGithubSchema,
	createRepositoryEntity,
	createUserEntity,
} from "../services/entities/fixtures";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import { RepositoryEntity } from "../services/entities/RepositoryEntity";
import { DuplicateEntityError, ValidationError } from "../shared";
import { OrganizationRepository } from "./OrganizationRepository";
import { RepoRepository } from "./RepositoryRepository";
import { UserRepository } from "./UserRepository";

describe("RepositoryRepository", () => {
	let repositoryRepo: RepoRepository;
	let userRepo: UserRepository;
	let orgRepo: OrganizationRepository;
	// Use timestamp to ensure unique IDs across test runs
	const testRunId = Date.now();

	beforeAll(async () => {
		const { table, repository, user, organization } =
			await createGithubSchema();
		repositoryRepo = new RepoRepository(table, repository, user, organization);
		userRepo = new UserRepository(user);
		orgRepo = new OrganizationRepository(organization);
	}, 15000);

	afterAll(async () => {
		await cleanupDDBClient();
	});

	it("should create a new repository with user owner", async () => {
		// Create user first
		const testUser = createUserEntity({ username: "repouser1" });
		await userRepo.createUser(testUser);

		const repoEntity = createRepositoryEntity({
			owner: "repouser1",
			repo_name: "test-repo",
		});

		const result = await repositoryRepo.createRepo(repoEntity);
		expect(result).toBeInstanceOf(RepositoryEntity);
		expect(result.owner).toBe("repouser1");
		expect(result.repoName).toBe("test-repo");

		await repositoryRepo.deleteRepo(repoEntity.getRepoId());
		await userRepo.deleteUser(testUser.username);
	});

	it("should create a new repository with organization owner", async () => {
		// Create organization first
		const testOrg = new OrganizationEntity({
			orgName: "testorg",
			description: "Test organization",
		});
		await orgRepo.createOrg(testOrg);

		const repoEntity = createRepositoryEntity({
			owner: "testorg",
			repo_name: "org-repo",
			is_private: true,
		});

		const result = await repositoryRepo.createRepo(repoEntity);
		expect(result).toBeInstanceOf(RepositoryEntity);
		expect(result.owner).toBe("testorg");
		expect(result.repoName).toBe("org-repo");

		await repositoryRepo.deleteRepo(repoEntity.getRepoId());
		await orgRepo.deleteOrg(testOrg.orgName);
	});

	it("should throw ValidationError when owner does not exist", async () => {
		const repoEntity = createRepositoryEntity({
			owner: "nonexistent",
			repo_name: "test-repo",
		});

		await expect(repositoryRepo.createRepo(repoEntity)).rejects.toThrow(
			ValidationError,
		);
	});

	it("should throw DuplicateEntityError for duplicate repository", async () => {
		// Create user first
		const testUser = createUserEntity({ username: "repouser2" });
		await userRepo.createUser(testUser);

		const repoEntity = createRepositoryEntity({
			owner: "repouser2",
			repo_name: "test-repo",
		});

		await repositoryRepo.createRepo(repoEntity);
		await expect(repositoryRepo.createRepo(repoEntity)).rejects.toThrow(
			DuplicateEntityError,
		);

		await repositoryRepo.deleteRepo(repoEntity.getRepoId());
		await userRepo.deleteUser(testUser.username);
	});

	it("should get an existing repository", async () => {
		// Create user and repository
		const testUser = createUserEntity({ username: "repouser3" });
		await userRepo.createUser(testUser);

		const repoEntity = createRepositoryEntity({
			owner: "repouser3",
			repo_name: "test-repo",
		});
		await repositoryRepo.createRepo(repoEntity);

		const result = await repositoryRepo.getRepo({
			owner: "repouser3",
			repo_name: "test-repo",
		});

		expect(result).toBeInstanceOf(RepositoryEntity);
		expect(result?.owner).toBe("repouser3");
		expect(result?.repoName).toBe("test-repo");

		await repositoryRepo.deleteRepo(repoEntity.getRepoId());
		await userRepo.deleteUser(testUser.username);
	});

	it("should return null for non-existent repository", async () => {
		const result = await repositoryRepo.getRepo({
			owner: "nonexistent",
			repo_name: "nonexistent",
		});

		expect(result).toBeUndefined();
	});

	it("should list repositories by owner", async () => {
		// Create user and repositories
		const testUser = createUserEntity({ username: "repouser4" });
		await userRepo.createUser(testUser);

		const repo1 = createRepositoryEntity({
			owner: "repouser4",
			repo_name: "repo1",
			is_private: false,
		});
		const repo2 = createRepositoryEntity({
			owner: "repouser4",
			repo_name: "repo2",
			is_private: true,
		});

		await repositoryRepo.createRepo(repo1);
		await repositoryRepo.createRepo(repo2);

		const result = await repositoryRepo.listByOwner("repouser4");

		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toBeInstanceOf(RepositoryEntity);
		expect(result.items.every((repo) => repo.owner === "repouser4")).toBe(true);

		// Clean up
		await repositoryRepo.deleteRepo({ owner: "repouser4", repo_name: "repo1" });
		await repositoryRepo.deleteRepo({ owner: "repouser4", repo_name: "repo2" });
		await userRepo.deleteUser(testUser.username);
	});

	it("should list repositories by owner sorted by creation time (newest first)", async () => {
		// Create user first
		const username = `repouser5-${testRunId}`;
		const testUser = createUserEntity({ username });
		await userRepo.createUser(testUser);

		// Create 3 repositories with small delays to ensure different timestamps
		const repo1 = createRepositoryEntity({
			owner: username,
			repo_name: "repo-first",
		});
		await repositoryRepo.createRepo(repo1);

		// Wait 50ms to ensure different timestamp
		await new Promise((resolve) => setTimeout(resolve, 50));

		const repo2 = createRepositoryEntity({
			owner: username,
			repo_name: "repo-second",
		});
		await repositoryRepo.createRepo(repo2);

		// Wait 50ms to ensure different timestamp
		await new Promise((resolve) => setTimeout(resolve, 50));

		const repo3 = createRepositoryEntity({
			owner: username,
			repo_name: "repo-third",
		});
		await repositoryRepo.createRepo(repo3);

		// List repositories by owner
		const result = await repositoryRepo.listByOwner(username);

		// Verify we got all 3 repositories
		expect(result.items).toHaveLength(3);

		// Verify they are sorted by creation time (newest first)
		// Since repo3 was created last, it should be first
		expect(result.items[0].repoName).toBe("repo-third");
		expect(result.items[1].repoName).toBe("repo-second");
		expect(result.items[2].repoName).toBe("repo-first");

		// Verify creation times are in reverse chronological order
		expect(result.items[0].created.toMillis()).toBeGreaterThanOrEqual(
			result.items[1].created.toMillis(),
		);
		expect(result.items[1].created.toMillis()).toBeGreaterThanOrEqual(
			result.items[2].created.toMillis(),
		);

		// Clean up
		await repositoryRepo.deleteRepo({
			owner: username,
			repo_name: "repo-first",
		});
		await repositoryRepo.deleteRepo({
			owner: username,
			repo_name: "repo-second",
		});
		await repositoryRepo.deleteRepo({
			owner: username,
			repo_name: "repo-third",
		});
		await userRepo.deleteUser(testUser.username);
	});
});
