import type { StarRepository } from "../repos";
import { StarEntity } from "./entities";
import type { StarResponse } from "./entities";
import { EntityNotFoundError } from "../shared";

class StarService {
	private readonly starRepo: StarRepository;

	constructor(repo: StarRepository) {
		this.starRepo = repo;
	}

	/**
	 * Stars a repository for a user
	 * @param userId - The user starring the repository
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @returns Star response with creation timestamp
	 * @throws {ValidationError} If user or repository does not exist
	 * @throws {DuplicateEntityError} If already starred
	 */
	public async starRepository(
		userId: string,
		owner: string,
		repo: string,
	): Promise<StarResponse> {
		const entity = StarEntity.fromRequest({
			username: userId,
			repo_owner: owner,
			repo_name: repo,
		});

		const createdEntity = await this.starRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Unstars a repository for a user
	 * @param userId - The user unstarring the repository
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If star does not exist
	 */
	public async unstarRepository(
		userId: string,
		owner: string,
		repo: string,
	): Promise<void> {
		// Check if star exists
		const isStarred = await this.starRepo.isStarred(userId, owner, repo);

		if (!isStarred) {
			throw new EntityNotFoundError(
				"StarEntity",
				`STAR#${userId}#${owner}#${repo}`,
			);
		}

		await this.starRepo.delete(userId, owner, repo);
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
	 * @param repo - Repository name
	 * @returns True if starred, false otherwise
	 */
	public async isStarred(
		userId: string,
		owner: string,
		repo: string,
	): Promise<boolean> {
		return await this.starRepo.isStarred(userId, owner, repo);
	}
}

export { StarService };
