import type { ForkRepository } from "../repos";
import { ForkEntity } from "./entities";
import type { ForkResponse } from "./entities";
import { EntityNotFoundError } from "../shared";

class ForkService {
	private readonly forkRepo: ForkRepository;

	constructor(repo: ForkRepository) {
		this.forkRepo = repo;
	}

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

export { ForkService };
