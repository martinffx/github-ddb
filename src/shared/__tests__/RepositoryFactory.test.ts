import { RepositoryFactory } from "../factories";
import { RepositoryEntity } from "../../services";
import type {
	RepositoryCreateRequest,
	RepositoryResponse,
} from "../types";

describe("RepositoryFactory", () => {
	describe("createEntity", () => {
		it("should create a valid repository entity with default values", () => {
			const entity = RepositoryFactory.createEntity();

			expect(entity).toBeInstanceOf(RepositoryEntity);
			expect(entity.owner).toMatch(/^[a-zA-Z0-9_-]+$/);
			expect(entity.repo_name).toMatch(/^[a-zA-Z0-9_.-]+$/);
			expect(typeof entity.is_private).toBe("boolean");
			expect(entity.created_at).toBeDefined();
			expect(entity.updated_at).toBeDefined();
		});

		it("should create entity with provided overrides", () => {
			const overrides = {
				owner: "custom-owner",
				repo_name: "custom-repo",
				description: "Custom description",
				is_private: true,
				language: "Rust",
			};

			const entity = RepositoryFactory.createEntity(overrides);

			expect(entity.owner).toBe("custom-owner");
			expect(entity.repo_name).toBe("custom-repo");
			expect(entity.description).toBe("Custom description");
			expect(entity.is_private).toBe(true);
			expect(entity.language).toBe("Rust");
		});

		it("should respect partial overrides", () => {
			const overrides = {
				description: "Only description override",
			};

			const entity = RepositoryFactory.createEntity(overrides);

			expect(entity.description).toBe("Only description override");
			expect(entity.owner).toBeDefined();
			expect(entity.repo_name).toBeDefined();
		});
	});

	describe("createRequest", () => {
		it("should create a valid repository create request", () => {
			const request = RepositoryFactory.createRequest();

			expect(request.owner).toMatch(/^[a-zA-Z0-9_-]+$/);
			expect(request.repo_name).toMatch(/^[a-zA-Z0-9_.-]+$/);
			expect(typeof request.is_private).toBe("boolean");
		});

		it("should create request with provided overrides", () => {
			const overrides = {
				owner: "test-owner",
				repo_name: "test-repo",
				description: "Test description",
				is_private: false,
				language: "Python",
			};

			const request = RepositoryFactory.createRequest(overrides);

			expect(request.owner).toBe("test-owner");
			expect(request.repo_name).toBe("test-repo");
			expect(request.description).toBe("Test description");
			expect(request.is_private).toBe(false);
			expect(request.language).toBe("Python");
		});
	});

	describe("createResponse", () => {
		it("should create a valid repository response", () => {
			const response = RepositoryFactory.createResponse();

			expect(response.owner).toMatch(/^[a-zA-Z0-9_-]+$/);
			expect(response.repo_name).toMatch(/^[a-zA-Z0-9_.-]+$/);
			expect(typeof response.is_private).toBe("boolean");
			expect(response.created_at).toBeDefined();
			expect(response.updated_at).toBeDefined();
		});

		it("should create response with provided overrides", () => {
			const overrides = {
				owner: "response-owner",
				repo_name: "response-repo",
				description: "Response description",
				is_private: true,
				language: "Go",
				created_at: "2023-01-01T00:00:00.000Z",
				updated_at: "2023-01-02T00:00:00.000Z",
			};

			const response = RepositoryFactory.createResponse(overrides);

			expect(response.owner).toBe("response-owner");
			expect(response.repo_name).toBe("response-repo");
			expect(response.description).toBe("Response description");
			expect(response.is_private).toBe(true);
			expect(response.language).toBe("Go");
			expect(response.created_at).toBe("2023-01-01T00:00:00.000Z");
			expect(response.updated_at).toBe("2023-01-02T00:00:00.000Z");
		});
	});

	describe("createMultiple", () => {
		it("should create multiple entities with default count", () => {
			const entities = RepositoryFactory.createMultiple();

			expect(entities).toHaveLength(3);
			entities.forEach((entity) => {
				expect(entity).toBeInstanceOf(RepositoryEntity);
			});
		});

		it("should create specified number of entities", () => {
			const entities = RepositoryFactory.createMultiple(5);

			expect(entities).toHaveLength(5);
			entities.forEach((entity) => {
				expect(entity).toBeInstanceOf(RepositoryEntity);
			});
		});

		it("should create entities with different names", () => {
			const entities = RepositoryFactory.createMultiple(3);

			const repoNames = entities.map((e) => e.repo_name);
			const uniqueNames = new Set(repoNames);
			expect(uniqueNames.size).toBe(3);
		});

		it("should allow common overrides", () => {
			const entities = RepositoryFactory.createMultiple(3, {
				owner: "common-owner",
				is_private: true,
			});

			entities.forEach((entity) => {
				expect(entity.owner).toBe("common-owner");
				expect(entity.is_private).toBe(true);
			});
		});
	});

	describe("createForOwner", () => {
		it("should create repositories for specific owner", () => {
			const entities = RepositoryFactory.createForOwner("test-owner", 3);

			expect(entities).toHaveLength(3);
			entities.forEach((entity) => {
				expect(entity.owner).toBe("test-owner");
				expect(entity).toBeInstanceOf(RepositoryEntity);
			});
		});

		it("should create repositories with different names for same owner", () => {
			const entities = RepositoryFactory.createForOwner("test-owner", 5);

			const repoNames = entities.map((e) => e.repo_name);
			const uniqueNames = new Set(repoNames);
			expect(uniqueNames.size).toBe(5);
		});

		it("should respect additional overrides", () => {
			const entities = RepositoryFactory.createForOwner("test-owner", 2, {
				is_private: true,
				language: "TypeScript",
			});

			entities.forEach((entity) => {
				expect(entity.owner).toBe("test-owner");
				expect(entity.is_private).toBe(true);
				expect(entity.language).toBe("TypeScript");
			});
		});
	});

	describe("createPrivatePublicMix", () => {
		it("should create mix of private and public repositories", () => {
			const entities = RepositoryFactory.createPrivatePublicMix(6);

			expect(entities).toHaveLength(6);

			const privateRepos = entities.filter((e) => e.is_private);
			const publicRepos = entities.filter((e) => !e.is_private);

			expect(privateRepos.length).toBe(3);
			expect(publicRepos.length).toBe(3);
		});

		it("should create for specific owner", () => {
			const entities = RepositoryFactory.createPrivatePublicMix(4, "test-owner");

			entities.forEach((entity) => {
				expect(entity.owner).toBe("test-owner");
			});

			const privateRepos = entities.filter((e) => e.is_private);
			const publicRepos = entities.filter((e) => !e.is_private);

			expect(privateRepos.length).toBe(2);
			expect(publicRepos.length).toBe(2);
		});
	});

	describe("seed generation", () => {
		it("should generate different data with different seeds", () => {
			const entity1 = RepositoryFactory.createEntity();
			const entity2 = RepositoryFactory.createEntity();

			// Since we're using timestamps as part of seed, entities should be different
			expect(entity1.repo_name).not.toBe(entity2.repo_name);
		});

		it("should generate valid repo names consistently", () => {
			const entities = Array.from({ length: 10 }, () =>
				RepositoryFactory.createEntity(),
			);

			entities.forEach((entity) => {
				expect(entity.repo_name).toMatch(/^[a-zA-Z0-9_.-]+$/);
				expect(entity.repo_name.length).toBeGreaterThan(0);
			});
		});
	});
});