import type { RepoRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
	RepositoryResponse,
	PaginatedResponse,
} from "../routes/schema";
import { RepositoryEntity } from "./entities";

type ListOptions = {
	limit?: number;
	offset?: string;
};

class RepositoryService {
	private readonly repoRepo: RepoRepository;

	constructor(repo: RepoRepository) {
		this.repoRepo = repo;
	}

	/**
	 * Creates a new repository with the provided details
	 * @param request - Repository creation data including owner, repo_name, and optional description/is_private/language
	 * @returns Repository response with timestamps
	 * @throws {DuplicateEntityError} If repository already exists
	 * @throws {ValidationError} If repository data is invalid or owner does not exist
	 */
	public async createRepository(
		request: RepositoryCreateRequest,
	): Promise<RepositoryResponse> {
		const entity = RepositoryEntity.fromRequest(request);
		const createdEntity = await this.repoRepo.createRepo(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves a repository by owner and repo name
	 * @param owner - The repository owner (user or organization)
	 * @param repoName - The repository name
	 * @returns Repository response with all repository data
	 * @throws {EntityNotFoundError} If repository does not exist
	 */
	public async getRepository(
		owner: string,
		repoName: string,
	): Promise<RepositoryResponse> {
		const repo = await this.repoRepo.getRepo({
			owner,
			repo_name: repoName,
		});

		if (repo === undefined) {
			throw new EntityNotFoundError(
				"RepositoryEntity",
				`REPO#${owner}#${repoName}`,
			);
		}

		return repo.toResponse();
	}

	/**
	 * Updates an existing repository with new data (partial updates supported)
	 * @param owner - The repository owner
	 * @param repoName - The repository name
	 * @param request - Repository update data (description, is_private, and/or language)
	 * @returns Updated repository response with new data
	 * @throws {EntityNotFoundError} If repository does not exist
	 * @throws {ValidationError} If update data is invalid
	 */
	public async updateRepository(
		owner: string,
		repoName: string,
		request: RepositoryUpdateRequest,
	): Promise<RepositoryResponse> {
		// First check if repository exists
		const existingRepo = await this.repoRepo.getRepo({
			owner,
			repo_name: repoName,
		});

		if (existingRepo === undefined) {
			throw new EntityNotFoundError(
				"RepositoryEntity",
				`REPO#${owner}#${repoName}`,
			);
		}

		// Update the entity with new data
		const updatedEntity = existingRepo.updateWith({
			description: request.description,
			is_private: request.is_private,
			language: request.language,
		});

		// Save and return
		const savedEntity = await this.repoRepo.updateRepo(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes a repository by owner and repo name
	 * @param owner - The repository owner
	 * @param repoName - The repository name
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If repository does not exist
	 */
	public async deleteRepository(
		owner: string,
		repoName: string,
	): Promise<void> {
		// First check if repository exists
		const existingRepo = await this.repoRepo.getRepo({
			owner,
			repo_name: repoName,
		});

		if (existingRepo === undefined) {
			throw new EntityNotFoundError(
				"RepositoryEntity",
				`REPO#${owner}#${repoName}`,
			);
		}

		await this.repoRepo.deleteRepo({
			owner,
			repo_name: repoName,
		});
	}

	/**
	 * Lists all repositories owned by a specific owner (user or organization)
	 * @param owner - The repository owner
	 * @param options - Optional pagination options (limit and offset)
	 * @returns Paginated list of repositories
	 */
	public async listRepositoriesByOwner(
		owner: string,
		options: ListOptions = {},
	): Promise<PaginatedResponse<RepositoryResponse>> {
		const result = await this.repoRepo.listByOwner(owner, options);

		return {
			items: result.items.map((entity) => entity.toResponse()),
			offset: result.offset,
		};
	}
}

export { RepositoryService };
