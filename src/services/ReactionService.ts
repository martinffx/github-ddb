import type { ReactionRepository } from "../repos";
import type { ReactionResponse } from "../routes/schema";
import { ReactionEntity } from "./entities";
import { EntityNotFoundError } from "../shared";

class ReactionService {
	private readonly reactionRepo: ReactionRepository;

	constructor(repo: ReactionRepository) {
		this.reactionRepo = repo;
	}

	/**
	 * Add a reaction to any target type (issue, PR, issue comment, PR comment)
	 * @param targetType - The type of target: "issue", "pullrequest", "issuecomment", "prcomment"
	 * @param targetId - The target identifier (issue number, PR number, or comment ID)
	 * @param emoji - The emoji reaction
	 * @param userId - The user adding the reaction
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @returns Reaction response
	 * @throws {ValidationError} If target does not exist or reaction already exists
	 */
	public async addReaction(
		owner: string,
		repoName: string,
		targetType: "issue" | "pullrequest" | "issuecomment" | "prcomment",
		targetId: string,
		emoji: string,
		userId: string,
	): Promise<ReactionResponse> {
		// Convert API target type to database target type
		const dbTargetType = this.convertTargetType(targetType);

		// Create entity from request
		const entity = ReactionEntity.fromRequest({
			owner,
			repo_name: repoName,
			target_type: dbTargetType,
			target_id: targetId,
			user: userId,
			emoji,
		});

		// Create in repository (validates target exists and no duplicate)
		const createdEntity = await this.reactionRepo.create(entity);

		return createdEntity.toResponse();
	}

	/**
	 * Remove a reaction from any target type
	 * @param targetType - The type of target: "issue", "pullrequest", "issuecomment", "prcomment"
	 * @param targetId - The target identifier
	 * @param emoji - The emoji reaction
	 * @param userId - The user removing the reaction
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If reaction does not exist
	 */
	public async removeReaction(
		owner: string,
		repoName: string,
		targetType: "issue" | "pullrequest" | "issuecomment" | "prcomment",
		targetId: string,
		emoji: string,
		userId: string,
	): Promise<void> {
		// Convert API target type to database target type
		const dbTargetType = this.convertTargetType(targetType);

		// Check if reaction exists
		const existingReaction = await this.reactionRepo.get(
			owner,
			repoName,
			dbTargetType,
			targetId,
			userId,
			emoji,
		);

		if (!existingReaction) {
			throw new EntityNotFoundError(
				"ReactionEntity",
				`REACTION#${owner}#${repoName}#${dbTargetType}#${targetId}#${userId}#${emoji}`,
			);
		}

		await this.reactionRepo.delete(
			owner,
			repoName,
			dbTargetType,
			targetId,
			userId,
			emoji,
		);
	}

	/**
	 * List all reactions for a target with pagination
	 *
	 * NOTE: Current implementation uses client-side pagination (slice).
	 * For large datasets, this should be refactored to use database-level
	 * pagination with cursor support for better performance.
	 *
	 * @param targetType - The type of target
	 * @param targetId - The target identifier
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async listReactions(
		owner: string,
		repoName: string,
		targetType: "issue" | "pullrequest" | "issuecomment" | "prcomment",
		targetId: string,
		limit?: number,
	): Promise<ReactionResponse[]> {
		// Convert API target type to database target type
		const dbTargetType = this.convertTargetType(targetType);

		const reactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			dbTargetType,
			targetId,
		);

		// Apply limit if provided (client-side pagination)
		const limitedReactions = limit ? reactions.slice(0, limit) : reactions;

		return limitedReactions.map((reaction) => reaction.toResponse());
	}

	/**
	 * Get reactions filtered by emoji for a target
	 *
	 * NOTE: Current implementation filters in-memory after fetching all reactions.
	 * For better performance with large datasets, emoji filtering should be pushed
	 * to the repository layer using DynamoDB query conditions.
	 *
	 * @param targetType - The type of target
	 * @param targetId - The target identifier
	 * @param emoji - The emoji to filter by
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async getReactionsByEmoji(
		owner: string,
		repoName: string,
		targetType: "issue" | "pullrequest" | "issuecomment" | "prcomment",
		targetId: string,
		emoji: string,
		limit?: number,
	): Promise<ReactionResponse[]> {
		// Convert API target type to database target type
		const dbTargetType = this.convertTargetType(targetType);

		// Get all reactions for the target (client-side filtering)
		const allReactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			dbTargetType,
			targetId,
		);

		// Filter by emoji (client-side)
		const filteredReactions = allReactions.filter(
			(reaction) => reaction.emoji === emoji,
		);

		// Apply limit if provided (client-side pagination)
		const limitedReactions = limit
			? filteredReactions.slice(0, limit)
			: filteredReactions;

		return limitedReactions.map((reaction) => reaction.toResponse());
	}

	/**
	 * Convert API target type to database target type
	 */
	private convertTargetType(
		apiType: "issue" | "pullrequest" | "issuecomment" | "prcomment",
	): "ISSUE" | "PR" | "ISSUECOMMENT" | "PRCOMMENT" {
		switch (apiType) {
			case "issue":
				return "ISSUE";
			case "pullrequest":
				return "PR";
			case "issuecomment":
				return "ISSUECOMMENT";
			case "prcomment":
				return "PRCOMMENT";
		}
	}
}

export { ReactionService };
