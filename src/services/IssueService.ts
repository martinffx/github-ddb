import type {
	IssueRepository,
	IssueCommentRepository,
	ReactionRepository,
} from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	IssueCreateRequest,
	IssueUpdateRequest,
	IssueResponse,
	ReactionResponse,
} from "../routes/schema";
import {
	IssueEntity,
	IssueCommentEntity,
	ReactionEntity,
	type IssueCommentResponse,
} from "./entities";

class IssueService {
	private readonly issueRepo: IssueRepository;
	private readonly issueCommentRepo: IssueCommentRepository;
	private readonly reactionRepo: ReactionRepository;

	constructor(
		repo: IssueRepository,
		commentRepo: IssueCommentRepository,
		reactionRepo: ReactionRepository,
	) {
		this.issueRepo = repo;
		this.issueCommentRepo = commentRepo;
		this.reactionRepo = reactionRepo;
	}

	/**
	 * Creates a new issue with sequential numbering
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param request - Issue creation data including title, body, status, author, assignees, and labels
	 * @returns Issue response with assigned issue number and timestamps
	 * @throws {ValidationError} If repository does not exist or issue data is invalid
	 */
	public async createIssue(
		owner: string,
		repoName: string,
		request: IssueCreateRequest,
	): Promise<IssueResponse> {
		const entity = IssueEntity.fromRequest({
			...request,
			owner,
			repo_name: repoName,
		});
		const createdEntity = await this.issueRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves an issue by owner, repo name, and issue number
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - The issue number to look up
	 * @returns Issue response with all issue data
	 * @throws {EntityNotFoundError} If issue does not exist
	 */
	public async getIssue(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<IssueResponse> {
		const issue = await this.issueRepo.get(owner, repoName, issueNumber);

		if (issue === undefined) {
			throw new EntityNotFoundError(
				"IssueEntity",
				`ISSUE#${owner}#${repoName}#${issueNumber}`,
			);
		}

		return issue.toResponse();
	}

	/**
	 * Lists all issues for a repository, optionally filtered by status
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param status - Optional filter: 'open' or 'closed'
	 * @returns Array of issue responses
	 */
	public async listIssues(
		owner: string,
		repoName: string,
		status?: "open" | "closed",
	): Promise<IssueResponse[]> {
		let issues: IssueEntity[];

		if (status) {
			issues = await this.issueRepo.listByStatus(owner, repoName, status);
		} else {
			issues = await this.issueRepo.list(owner, repoName);
		}

		return issues.map((issue) => issue.toResponse());
	}

	/**
	 * Updates an existing issue with new data (partial updates supported)
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - The issue number to update
	 * @param request - Issue update data (title, body, status, assignees, and/or labels)
	 * @returns Updated issue response with new data
	 * @throws {EntityNotFoundError} If issue does not exist
	 * @throws {ValidationError} If update data is invalid
	 */
	public async updateIssue(
		owner: string,
		repoName: string,
		issueNumber: number,
		request: IssueUpdateRequest,
	): Promise<IssueResponse> {
		// First check if issue exists
		const existingIssue = await this.issueRepo.get(
			owner,
			repoName,
			issueNumber,
		);

		if (existingIssue === undefined) {
			throw new EntityNotFoundError(
				"IssueEntity",
				`ISSUE#${owner}#${repoName}#${issueNumber}`,
			);
		}

		// Update the entity with new data
		const updatedEntity = existingIssue.updateIssue({
			title: request.title,
			body: request.body,
			status: request.status,
			assignees: request.assignees,
			labels: request.labels,
		});

		// Save and return
		const savedEntity = await this.issueRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes an issue by owner, repo name, and issue number
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - The issue number to delete
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If issue does not exist
	 */
	public async deleteIssue(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<void> {
		// First check if issue exists
		const existingIssue = await this.issueRepo.get(
			owner,
			repoName,
			issueNumber,
		);

		if (existingIssue === undefined) {
			throw new EntityNotFoundError(
				"IssueEntity",
				`ISSUE#${owner}#${repoName}#${issueNumber}`,
			);
		}

		await this.issueRepo.delete(owner, repoName, issueNumber);
	}

	// ============= ISSUE COMMENT METHODS =============

	/**
	 * Creates a new comment on an issue
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param author - Comment author
	 * @param body - Comment text
	 * @returns Created issue comment
	 * @throws {ValidationError} If issue does not exist or data is invalid
	 */
	public async createComment(
		owner: string,
		repoName: string,
		issueNumber: number,
		author: string,
		body: string,
	): Promise<IssueCommentResponse> {
		const entity = IssueCommentEntity.fromRequest({
			owner,
			repo_name: repoName,
			issue_number: issueNumber,
			author,
			body,
		});

		const createdEntity = await this.issueCommentRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves a specific comment by ID
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param commentId - Comment UUID
	 * @returns Issue comment response
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async getComment(
		owner: string,
		repoName: string,
		issueNumber: number,
		commentId: string,
	): Promise<IssueCommentResponse> {
		const comment = await this.issueCommentRepo.get(
			owner,
			repoName,
			issueNumber,
			commentId,
		);

		if (!comment) {
			throw new EntityNotFoundError(
				"IssueCommentEntity",
				`COMMENT#${owner}#${repoName}#${issueNumber}#${commentId}`,
			);
		}

		return comment.toResponse();
	}

	/**
	 * Lists all comments for an issue
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @returns Array of issue comments
	 */
	public async listComments(
		owner: string,
		repoName: string,
		issueNumber: number,
	): Promise<IssueCommentResponse[]> {
		const entities = await this.issueCommentRepo.listByIssue(
			owner,
			repoName,
			issueNumber,
		);
		return entities.map((entity) => entity.toResponse());
	}

	/**
	 * Updates an issue comment
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param commentId - Comment UUID
	 * @param body - New comment text
	 * @returns Updated issue comment
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async updateComment(
		owner: string,
		repoName: string,
		issueNumber: number,
		commentId: string,
		body: string,
	): Promise<IssueCommentResponse> {
		// Get existing comment
		const existingComment = await this.issueCommentRepo.get(
			owner,
			repoName,
			issueNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"IssueCommentEntity",
				`COMMENT#${owner}#${repoName}#${issueNumber}#${commentId}`,
			);
		}

		// Create updated entity using updateWith pattern
		const updatedEntity = existingComment.updateWith({ body });

		const savedEntity = await this.issueCommentRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes an issue comment
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param commentId - Comment UUID
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async deleteComment(
		owner: string,
		repoName: string,
		issueNumber: number,
		commentId: string,
	): Promise<void> {
		// Check if comment exists
		const existingComment = await this.issueCommentRepo.get(
			owner,
			repoName,
			issueNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"IssueCommentEntity",
				`COMMENT#${owner}#${repoName}#${issueNumber}#${commentId}`,
			);
		}

		await this.issueCommentRepo.delete(owner, repoName, issueNumber, commentId);
	}

	// ============= ISSUE REACTION METHODS =============

	/**
	 * Adds a reaction to an issue
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param emoji - The emoji reaction
	 * @param userId - The user adding the reaction
	 * @returns Reaction response
	 * @throws {ValidationError} If issue does not exist or reaction already exists
	 */
	public async addReaction(
		owner: string,
		repoName: string,
		issueNumber: number,
		emoji: string,
		userId: string,
	): Promise<ReactionResponse> {
		// Create entity from request
		const entity = ReactionEntity.fromRequest({
			owner,
			repo_name: repoName,
			target_type: "ISSUE",
			target_id: String(issueNumber),
			user: userId,
			emoji,
		});

		// Create in repository (validates target exists and no duplicate)
		const createdEntity = await this.reactionRepo.create(entity);

		return createdEntity.toResponse();
	}

	/**
	 * Removes a reaction from an issue
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param emoji - The emoji reaction
	 * @param userId - The user removing the reaction
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If reaction does not exist
	 */
	public async removeReaction(
		owner: string,
		repoName: string,
		issueNumber: number,
		emoji: string,
		userId: string,
	): Promise<void> {
		// Check if reaction exists
		const existingReaction = await this.reactionRepo.get(
			owner,
			repoName,
			"ISSUE",
			String(issueNumber),
			userId,
			emoji,
		);

		if (!existingReaction) {
			throw new EntityNotFoundError(
				"ReactionEntity",
				`REACTION#${owner}#${repoName}#ISSUE#${issueNumber}#${userId}#${emoji}`,
			);
		}

		await this.reactionRepo.delete(
			owner,
			repoName,
			"ISSUE",
			String(issueNumber),
			userId,
			emoji,
		);
	}

	/**
	 * Lists all reactions for an issue with optional pagination
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async listReactions(
		owner: string,
		repoName: string,
		issueNumber: number,
		limit?: number,
	): Promise<ReactionResponse[]> {
		const reactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			"ISSUE",
			String(issueNumber),
		);

		// Apply limit if provided (client-side pagination)
		const limitedReactions = limit ? reactions.slice(0, limit) : reactions;

		return limitedReactions.map((reaction) => reaction.toResponse());
	}

	/**
	 * Gets reactions filtered by emoji for an issue
	 * @param owner - Repository owner
	 * @param repoName - Repository name
	 * @param issueNumber - Issue number
	 * @param emoji - The emoji to filter by
	 * @param limit - Maximum number of reactions to return (client-side limit)
	 * @returns Array of reaction responses
	 */
	public async getReactionsByEmoji(
		owner: string,
		repoName: string,
		issueNumber: number,
		emoji: string,
		limit?: number,
	): Promise<ReactionResponse[]> {
		// Get all reactions for the issue (client-side filtering)
		const allReactions = await this.reactionRepo.listByTarget(
			owner,
			repoName,
			"ISSUE",
			String(issueNumber),
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

export { IssueService };
