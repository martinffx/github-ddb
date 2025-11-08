import type { RepoRepository, StarRepository, ForkRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
	RepositoryResponse,
	PaginatedResponse,
} from "../routes/schema";
import {
	RepositoryEntity,
	StarEntity,
	ForkEntity,
	type StarResponse,
	type ForkResponse,
} from "./entities";

type ListOptions = {
	limit?: number;
	offset?: string;
};

class RepositoryService {
	private readonly repoRepo: RepoRepository;
	private readonly starRepo: StarRepository;
	private readonly forkRepo: ForkRepository;

	constructor(
		repo: RepoRepository,
		starRepo: StarRepository,
		forkRepo: ForkRepository,
	) {
		this.repoRepo = repo;
		this.starRepo = starRepo;
		this.forkRepo = forkRepo;
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

	// ============= STAR METHODS =============

	/**
	 * Stars a repository for a user
	 * @param userId - The user starring the repository
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @returns Star response with creation timestamp
	 * @throws {ValidationError} If user or repository does not exist
	 * @throws {DuplicateEntityError} If already starred
	 */
	public async starRepository(
		userId: string,
		owner: string,
		repoName: string,
	): Promise<StarResponse> {
		const entity = StarEntity.fromRequest({
			username: userId,
			repo_owner: owner,
			repo_name: repoName,
		});

		const createdEntity = await this.starRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Unstars a repository for a user
	 * @param userId - The user unstarring the repository
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If star does not exist
	 */
	public async unstarRepository(
		userId: string,
		owner: string,
		repoName: string,
	): Promise<void> {
		// Check if star exists
		const isStarred = await this.starRepo.isStarred(userId, owner, repoName);

		if (!isStarred) {
			throw new EntityNotFoundError(
				"StarEntity",
				`STAR#${userId}#${owner}#${repoName}`,
			);
		}

		await this.starRepo.delete(userId, owner, repoName);
	}

	/**
	 * Lists all repositories starred by a user
	 * @param userId - The user whose starred repositories to list
	 * @returns Array of star responses
	 */
	public async listUserStars(userId: string): Promise<StarResponse[]> {
		const stars = await this.starRepo.listStarsByUser(userId);
		return stars.map((star) => star.toResponse());
	}

	/**
	 * Checks if a user has starred a repository
	 * @param userId - The user to check
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @returns True if starred, false otherwise
	 */
	public async isStarred(
		userId: string,
		owner: string,
		repoName: string,
	): Promise<boolean> {
		return await this.starRepo.isStarred(userId, owner, repoName);
	}

	// ============= FORK METHODS =============

	/**
	 * Creates a new fork relationship between repositories
	 * @param sourceOwner - Original repository owner
	 * @param sourceRepo - Original repository name
	 * @param forkedOwner - Fork owner
	 * @param forkedRepo - Fork repository name
	 * @returns Fork response with creation timestamp
	 * @throws {ValidationError} If repositories do not exist
	 * @throws {DuplicateEntityError} If fork already exists
	 */
	public async createFork(
		sourceOwner: string,
		sourceRepo: string,
		forkedOwner: string,
		forkedRepo: string,
	): Promise<ForkResponse> {
		const entity = ForkEntity.fromRequest({
			original_owner: sourceOwner,
			original_repo: sourceRepo,
			fork_owner: forkedOwner,
			fork_repo: forkedRepo,
		});

		const createdEntity = await this.forkRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Deletes a fork relationship
	 * @param sourceOwner - Original repository owner
	 * @param sourceRepo - Original repository name
	 * @param forkedOwner - Fork owner
	 * @param forkedRepo - Fork repository name
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If fork does not exist
	 */
	public async deleteFork(
		sourceOwner: string,
		sourceRepo: string,
		forkedOwner: string,
		_forkedRepo: string,
	): Promise<void> {
		// Check if fork exists
		const existingFork = await this.forkRepo.get(
			sourceOwner,
			sourceRepo,
			forkedOwner,
		);

		if (!existingFork) {
			throw new EntityNotFoundError(
				"ForkEntity",
				`FORK#${sourceOwner}#${sourceRepo}#${forkedOwner}`,
			);
		}

		await this.forkRepo.delete(sourceOwner, sourceRepo, forkedOwner);
	}

	/**
	 * Lists all forks of a repository
	 * @param sourceOwner - Original repository owner
	 * @param sourceRepo - Original repository name
	 * @returns Array of fork responses
	 */
	public async listForks(
		sourceOwner: string,
		sourceRepo: string,
	): Promise<ForkResponse[]> {
		const forks = await this.forkRepo.listForksOfRepo(sourceOwner, sourceRepo);
		return forks.map((fork) => fork.toResponse());
	}

	/**
	 * Gets a specific fork by source repo and fork owner
	 * @param sourceOwner - Original repository owner
	 * @param sourceRepo - Original repository name
	 * @param forkedOwner - Fork owner
	 * @param forkedRepo - Fork repository name
	 * @returns Fork response or undefined if not found
	 */
	public async getFork(
		sourceOwner: string,
		sourceRepo: string,
		forkedOwner: string,
		_forkedRepo: string,
	): Promise<ForkResponse | undefined> {
		const fork = await this.forkRepo.get(sourceOwner, sourceRepo, forkedOwner);
		return fork ? fork.toResponse() : undefined;
	}
}

export { RepositoryService };
