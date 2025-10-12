import {
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

	beforeAll(async () => {
		const { table, repository, user, organization } =
			await createGithubSchema();
		repositoryRepo = new RepoRepository(table, repository, user, organization);
		userRepo = new UserRepository(user);
		orgRepo = new OrganizationRepository(organization);
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
});
