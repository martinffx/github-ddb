import { RepositoryService } from "./RepositoryService";
import type { RepoRepository, StarRepository, ForkRepository } from "../repos";
import { RepositoryEntity } from "./entities";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import type {
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
} from "../routes/schema";

describe("RepositoryService", () => {
	const mockRepoRepo = jest.mocked<RepoRepository>({
		createRepo: jest.fn(),
		getRepo: jest.fn(),
		updateRepo: jest.fn(),
		deleteRepo: jest.fn(),
		listByOwner: jest.fn(),
	} as unknown as RepoRepository);

	const mockStarRepo = jest.mocked<StarRepository>({
		create: jest.fn(),
		delete: jest.fn(),
		listStarsByUser: jest.fn(),
		isStarred: jest.fn(),
	} as unknown as StarRepository);

	const mockForkRepo = jest.mocked<ForkRepository>({
		create: jest.fn(),
		get: jest.fn(),
		delete: jest.fn(),
		listForksOfRepo: jest.fn(),
	} as unknown as ForkRepository);

	const repoService = new RepositoryService(
		mockRepoRepo,
		mockStarRepo,
		mockForkRepo,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createRepository", () => {
		it("should create a new repository successfully", async () => {
			// Arrange
			const request: RepositoryCreateRequest = {
				owner: "testuser",
				repo_name: "test-repo",
				description: "Test repository",
				is_private: false,
				language: "TypeScript",
			};

			const mockEntity = RepositoryEntity.fromRequest(request);
			mockRepoRepo.createRepo.mockResolvedValue(mockEntity);

			// Act
			const result = await repoService.createRepository(request);

			// Assert
			expect(mockRepoRepo.createRepo).toHaveBeenCalledTimes(1);
			expect(mockRepoRepo.createRepo).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: request.owner,
					repoName: request.repo_name,
					description: request.description,
					isPrivate: request.is_private,
					language: request.language,
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.owner).toBe(request.owner);
			expect(result.repo_name).toBe(request.repo_name);
			expect(result.description).toBe(request.description);
		});

		it("should throw DuplicateEntityError when repository already exists", async () => {
			// Arrange
			const request: RepositoryCreateRequest = {
				owner: "testuser",
				repo_name: "existing-repo",
			};

			mockRepoRepo.createRepo.mockRejectedValue(
				new DuplicateEntityError(
					"RepositoryEntity",
					`REPO#${request.owner}#${request.repo_name}`,
				),
			);

			// Act & Assert
			await expect(repoService.createRepository(request)).rejects.toThrow(
				DuplicateEntityError,
			);
			await expect(repoService.createRepository(request)).rejects.toThrow(
				"already exists",
			);
		});

		it("should throw ValidationError for invalid repository data", async () => {
			// Arrange
			const request: RepositoryCreateRequest = {
				owner: "nonexistent-user",
				repo_name: "test-repo",
			};

			mockRepoRepo.createRepo.mockRejectedValue(
				new ValidationError("owner", "Owner 'nonexistent-user' does not exist"),
			);

			// Act & Assert
			await expect(repoService.createRepository(request)).rejects.toThrow(
				ValidationError,
			);
		});
	});

	describe("getRepository", () => {
		it("should retrieve an existing repository", async () => {
			// Arrange
			const mockEntity = new RepositoryEntity({
				owner: "testuser",
				repoName: "test-repo",
				description: "Test repository",
				isPrivate: false,
				language: "TypeScript",
			});

			mockRepoRepo.getRepo.mockResolvedValue(mockEntity);

			// Act
			const result = await repoService.getRepository("testuser", "test-repo");

			// Assert
			expect(mockRepoRepo.getRepo).toHaveBeenCalledWith({
				owner: "testuser",
				repo_name: "test-repo",
			});
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.owner).toBe("testuser");
			expect(result.repo_name).toBe("test-repo");
		});

		it("should throw EntityNotFoundError for non-existent repository", async () => {
			// Arrange
			mockRepoRepo.getRepo.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				repoService.getRepository("testuser", "nonexistent"),
			).rejects.toThrow(EntityNotFoundError);
			await expect(
				repoService.getRepository("testuser", "nonexistent"),
			).rejects.toThrow("not found");
		});
	});

	describe("updateRepository", () => {
		it("should update an existing repository successfully", async () => {
			// Arrange
			const owner = "testuser";
			const repoName = "test-repo";
			const updateRequest: RepositoryUpdateRequest = {
				description: "Updated description",
				is_private: true,
				language: "JavaScript",
			};

			const existingEntity = new RepositoryEntity({
				owner,
				repoName,
				description: "Old description",
				isPrivate: false,
				language: "TypeScript",
			});

			const updatedEntity = existingEntity.updateWith({
				description: updateRequest.description,
				is_private: updateRequest.is_private,
				language: updateRequest.language,
			});

			mockRepoRepo.getRepo.mockResolvedValue(existingEntity);
			mockRepoRepo.updateRepo.mockResolvedValue(updatedEntity);

			// Act
			const result = await repoService.updateRepository(
				owner,
				repoName,
				updateRequest,
			);

			// Assert
			expect(mockRepoRepo.getRepo).toHaveBeenCalledWith({
				owner,
				repo_name: repoName,
			});
			expect(mockRepoRepo.updateRepo).toHaveBeenCalledTimes(1);
			expect(mockRepoRepo.updateRepo).toHaveBeenCalledWith(
				expect.objectContaining({
					owner,
					repoName,
					description: updateRequest.description,
					isPrivate: updateRequest.is_private,
					language: updateRequest.language,
				}),
			);
			expect(result.description).toBe(updateRequest.description);
			expect(result.is_private).toBe(updateRequest.is_private);
			expect(result.language).toBe(updateRequest.language);
		});

		it("should throw EntityNotFoundError when repository does not exist", async () => {
			// Arrange
			const owner = "testuser";
			const repoName = "nonexistent";
			const updateRequest: RepositoryUpdateRequest = {
				description: "Updated description",
			};

			mockRepoRepo.getRepo.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				repoService.updateRepository(owner, repoName, updateRequest),
			).rejects.toThrow(EntityNotFoundError);
		});

		it("should allow partial updates", async () => {
			// Arrange
			const owner = "testuser";
			const repoName = "test-repo";
			const updateRequest: RepositoryUpdateRequest = {
				description: "Updated description only",
			};

			const existingEntity = new RepositoryEntity({
				owner,
				repoName,
				description: "Old description",
				isPrivate: false,
				language: "TypeScript",
			});

			const updatedEntity = existingEntity.updateWith({
				description: updateRequest.description,
			});

			mockRepoRepo.getRepo.mockResolvedValue(existingEntity);
			mockRepoRepo.updateRepo.mockResolvedValue(updatedEntity);

			// Act
			const result = await repoService.updateRepository(
				owner,
				repoName,
				updateRequest,
			);

			// Assert
			expect(result.description).toBe(updateRequest.description);
			expect(result.is_private).toBe(existingEntity.isPrivate); // Should be unchanged
			expect(result.language).toBe(existingEntity.language); // Should be unchanged
		});
	});

	describe("deleteRepository", () => {
		it("should delete an existing repository successfully", async () => {
			// Arrange
			const owner = "testuser";
			const repoName = "test-repo";
			const existingEntity = new RepositoryEntity({
				owner,
				repoName,
				description: "Test repository",
			});

			mockRepoRepo.getRepo.mockResolvedValue(existingEntity);
			mockRepoRepo.deleteRepo.mockResolvedValue(undefined);

			// Act
			await repoService.deleteRepository(owner, repoName);

			// Assert
			expect(mockRepoRepo.getRepo).toHaveBeenCalledWith({
				owner,
				repo_name: repoName,
			});
			expect(mockRepoRepo.deleteRepo).toHaveBeenCalledWith({
				owner,
				repo_name: repoName,
			});
		});

		it("should throw EntityNotFoundError when repository does not exist", async () => {
			// Arrange
			const owner = "testuser";
			const repoName = "nonexistent";
			mockRepoRepo.getRepo.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				repoService.deleteRepository(owner, repoName),
			).rejects.toThrow(EntityNotFoundError);
			expect(mockRepoRepo.deleteRepo).not.toHaveBeenCalled();
		});
	});

	describe("listRepositoriesByOwner", () => {
		it("should return multiple repositories for an owner", async () => {
			// Arrange
			const owner = "testuser";
			const mockRepos = [
				new RepositoryEntity({
					owner,
					repoName: "repo1",
					description: "First repository",
					isPrivate: false,
				}),
				new RepositoryEntity({
					owner,
					repoName: "repo2",
					description: "Second repository",
					isPrivate: true,
				}),
			];

			mockRepoRepo.listByOwner.mockResolvedValue({
				items: mockRepos,
				offset: undefined,
			});

			// Act
			const result = await repoService.listRepositoriesByOwner(owner);

			// Assert
			expect(mockRepoRepo.listByOwner).toHaveBeenCalledWith(owner, {});
			expect(result.items).toHaveLength(2);
			expect(result.items[0].repo_name).toBe("repo1");
			expect(result.items[1].repo_name).toBe("repo2");
			expect(result.offset).toBeUndefined();
		});

		it("should return empty list when owner has no repositories", async () => {
			// Arrange
			const owner = "testuser";
			mockRepoRepo.listByOwner.mockResolvedValue({
				items: [],
				offset: undefined,
			});

			// Act
			const result = await repoService.listRepositoriesByOwner(owner);

			// Assert
			expect(mockRepoRepo.listByOwner).toHaveBeenCalledWith(owner, {});
			expect(result.items).toHaveLength(0);
			expect(result.offset).toBeUndefined();
		});

		it("should support pagination with offset", async () => {
			// Arrange
			const owner = "testuser";
			const options = { limit: 10, offset: "next-page-token" };
			const mockRepos = [
				new RepositoryEntity({
					owner,
					repoName: "repo3",
					description: "Third repository",
				}),
			];

			mockRepoRepo.listByOwner.mockResolvedValue({
				items: mockRepos,
				offset: "another-page-token",
			});

			// Act
			const result = await repoService.listRepositoriesByOwner(owner, options);

			// Assert
			expect(mockRepoRepo.listByOwner).toHaveBeenCalledWith(owner, options);
			expect(result.items).toHaveLength(1);
			expect(result.offset).toBe("another-page-token");
		});
	});
});
