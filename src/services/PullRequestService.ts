import type {
	PullRequestRepository,
	PRCommentRepository,
	ReactionRepository,
} from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	PullRequestCreateRequest,
	PullRequestUpdateRequest,
	PullRequestResponse,
	ReactionResponse,
} from "../routes/schema";
import {
	PullRequestEntity,
	PRCommentEntity,
	ReactionEntity,
	type PRCommentResponse,
} from "./entities";

class PullRequestService {
	private readonly pullRequestRepo: PullRequestRepository;
	private readonly prCommentRepo: PRCommentRepository;
	private readonly reactionRepo: ReactionRepository;

	constructor(
		repo: PullRequestRepository,
		commentRepo: PRCommentRepository,
		reactionRepo: ReactionRepository,
	) {
		this.pullRequestRepo = repo;
		this.prCommentRepo = commentRepo;
		this.reactionRepo = reactionRepo;
	}

	/**
	 * Creates a new pull request with sequential numbering
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param request - Pull request creation data including title, body, status, author, branches, and merge commit
	 * @returns Pull request response with assigned PR number and timestamps
	 * @throws {ValidationError} If repository does not exist or pull request data is invalid
	 */
	public async createPullRequest(
		owner: string,
		repoName: string,
		request: PullRequestCreateRequest,
	): Promise<PullRequestResponse> {
		const entity = PullRequestEntity.fromRequest({
			...request,
			owner,
			repo_name: repoName,
		});
		const createdEntity = await this.pullRequestRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves a pull request by owner, repo name, and PR number
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - The PR number to look up
	 * @returns Pull request response with all PR data
	 * @throws {EntityNotFoundError} If pull request does not exist
	 */
	public async getPullRequest(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<PullRequestResponse> {
		const pullRequest = await this.pullRequestRepo.get(
			owner,
			repoName,
			prNumber,
		);

		if (pullRequest === undefined) {
			throw new EntityNotFoundError(
				"PullRequestEntity",
				`PR#${owner}#${repoName}#${prNumber}`,
			);
		}

		return pullRequest.toResponse();
	}

	/**
	 * Lists all pull requests for a repository, optionally filtered by status
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param status - Optional filter: 'open', 'closed', or 'merged'
	 * @returns Array of pull request responses
	 */
	public async listPullRequests(
		owner: string,
		repoName: string,
		status?: "open" | "closed" | "merged",
	): Promise<PullRequestResponse[]> {
		let pullRequests: PullRequestEntity[];

		if (status) {
			pullRequests = await this.pullRequestRepo.listByStatus(
				owner,
				repoName,
				status,
			);
		} else {
			pullRequests = await this.pullRequestRepo.list(owner, repoName);
		}

		return pullRequests.map((pr) => pr.toResponse());
	}

	/**
	 * Updates an existing pull request with new data (partial updates supported)
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - The PR number to update
	 * @param request - Pull request update data (title, body, status, branches, and/or merge commit)
	 * @returns Updated pull request response with new data
	 * @throws {EntityNotFoundError} If pull request does not exist
	 * @throws {ValidationError} If update data is invalid
	 */
	public async updatePullRequest(
		owner: string,
		repoName: string,
		prNumber: number,
		request: PullRequestUpdateRequest,
	): Promise<PullRequestResponse> {
		// First check if pull request exists
		const existingPR = await this.pullRequestRepo.get(
			owner,
			repoName,
			prNumber,
		);

		if (existingPR === undefined) {
			throw new EntityNotFoundError(
				"PullRequestEntity",
				`PR#${owner}#${repoName}#${prNumber}`,
			);
		}

		// Update the entity with new data
		const updatedEntity = existingPR.updatePullRequest({
			title: request.title,
			body: request.body,
			status: request.status,
			source_branch: request.source_branch,
			target_branch: request.target_branch,
			merge_commit_sha: request.merge_commit_sha,
		});

		// Save and return
		const savedEntity = await this.pullRequestRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes a pull request by owner, repo name, and PR number
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - The PR number to delete
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If pull request does not exist
	 */
	public async deletePullRequest(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<void> {
		// First check if pull request exists
		const existingPR = await this.pullRequestRepo.get(
			owner,
			repoName,
			prNumber,
		);

		if (existingPR === undefined) {
			throw new EntityNotFoundError(
				"PullRequestEntity",
				`PR#${owner}#${repoName}#${prNumber}`,
			);
		}

		await this.pullRequestRepo.delete(owner, repoName, prNumber);
	}

	// ============= PR COMMENT METHODS =============

	/**
	 * Creates a new comment on a pull request
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param author - Comment author
	 * @param body - Comment text
	 * @returns Created PR comment
	 * @throws {ValidationError} If PR does not exist or data is invalid
	 */
	public async createComment(
		owner: string,
		repoName: string,
		prNumber: number,
		author: string,
		body: string,
	): Promise<PRCommentResponse> {
		const entity = PRCommentEntity.fromRequest({
			owner,
			repo_name: repoName,
			pr_number: prNumber,
			author,
			body,
		});

		const createdEntity = await this.prCommentRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves a specific comment by ID
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param commentId - Comment UUID
	 * @returns PR comment response
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async getComment(
		owner: string,
		repoName: string,
		prNumber: number,
		commentId: string,
	): Promise<PRCommentResponse> {
		const comment = await this.prCommentRepo.get(
			owner,
			repoName,
			prNumber,
			commentId,
		);

		if (!comment) {
			throw new EntityNotFoundError(
				"PRCommentEntity",
				`COMMENT#${owner}#${repoName}#${prNumber}#${commentId}`,
			);
		}

		return comment.toResponse();
	}

	/**
	 * Lists all comments for a pull request
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @returns Array of PR comments
	 */
	public async listComments(
		owner: string,
		repoName: string,
		prNumber: number,
	): Promise<PRCommentResponse[]> {
		const entities = await this.prCommentRepo.listByPR(
			owner,
			repoName,
			prNumber,
		);
		return entities.map((entity) => entity.toResponse());
	}

	/**
	 * Updates a PR comment
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param commentId - Comment UUID
	 * @param body - New comment text
	 * @returns Updated PR comment
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async updateComment(
		owner: string,
		repoName: string,
		prNumber: number,
		commentId: string,
		body: string,
	): Promise<PRCommentResponse> {
		// Get existing comment
		const existingComment = await this.prCommentRepo.get(
			owner,
			repoName,
			prNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"PRCommentEntity",
				`COMMENT#${owner}#${repoName}#${prNumber}#${commentId}`,
			);
		}

		// Use entity's updateWith method
		const updatedEntity = existingComment.updateWith({ body });

		const savedEntity = await this.prCommentRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes a PR comment
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param commentId - Comment UUID
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async deleteComment(
		owner: string,
		repoName: string,
		prNumber: number,
		commentId: string,
	): Promise<void> {
		// Check if comment exists
		const existingComment = await this.prCommentRepo.get(
			owner,
			repoName,
			prNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"PRCommentEntity",
				`COMMENT#${owner}#${repoName}#${prNumber}#${commentId}`,
			);
		}

		await this.prCommentRepo.delete(owner, repoName, prNumber, commentId);
	}

	// ============= PR REACTION METHODS =============

	/**
	 * Adds a reaction to a pull request
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param emoji - The emoji reaction
	 * @param userId - The user adding the reaction
	 * @returns Reaction response
	 * @throws {ValidationError} If PR does not exist or reaction already exists
	 */
	public async addReaction(
		owner: string,
		repoName: string,
		prNumber: number,
		emoji: string,
		userId: string,
	): Promise<ReactionResponse> {
		// Create entity from request
		const entity = ReactionEntity.fromRequest({
			owner,
			repo_name: repoName,
			target_type: "PR",
			target_id: String(prNumber),
			user: userId,
			emoji,
		});

		// Create in repository (validates target exists and no duplicate)
		const createdEntity = await this.reactionRepo.create(entity);

		return createdEntity.toResponse();
	}

	/**
	 * Removes a reaction from a pull request
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param emoji - The emoji reaction
	 * @param userId - The user removing the reaction
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If reaction does not exist
	 */
	public async removeReaction(
		owner: string,
		repoName: string,
		prNumber: number,
		emoji: string,
		userId: string,
	): Promise<void> {
		// Check if reaction exists
		const existingReaction = await this.reactionRepo.get(
			owner,
			repoName,
			"PR",
			String(prNumber),
			userId,
			emoji,
		);

		if (!existingReaction) {
			throw new EntityNotFoundError(
				"ReactionEntity",
				`REACTION#${owner}#${repoName}#PR#${prNumber}#${userId}#${emoji}`,
			);
		}

		await this.reactionRepo.delete(
			owner,
			repoName,
			"PR",
			String(prNumber),
			userId,
			emoji,
		);
	}

	/**
	 * Lists all reactions for a pull request with optional pagination
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async listReactions(
		owner: string,
		repoName: string,
		prNumber: number,
		limit?: number,
	): Promise<ReactionResponse[]> {
		const reactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			"PR",
			String(prNumber),
		);

		// Apply limit if provided (client-side pagination)
		const limitedReactions = limit ? reactions.slice(0, limit) : reactions;

		return limitedReactions.map((reaction) => reaction.toResponse());
	}

	/**
	 * Gets reactions filtered by emoji for a pull request
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param prNumber - Pull request number
	 * @param emoji - The emoji to filter by
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async getReactionsByEmoji(
		owner: string,
		repoName: string,
		prNumber: number,
		emoji: string,
		limit?: number,
	): Promise<ReactionResponse[]> {
		// Get all reactions for the PR (client-side filtering)
		const allReactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			"PR",
			String(prNumber),
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
}

export { PullRequestService };
