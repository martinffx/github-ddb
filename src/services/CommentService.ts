import type { IssueCommentRepository, PRCommentRepository } from "../repos";
import {
	IssueCommentEntity,
	PRCommentEntity,
	type IssueCommentResponse,
	type PRCommentResponse,
} from "./entities";
import { EntityNotFoundError } from "../shared";

/**
 * CommentService handles business logic for both Issue and PR comments
 * Supports creating, listing, updating, and deleting comments
 */
class CommentService {
	private readonly issueCommentRepo: IssueCommentRepository;
	private readonly prCommentRepo: PRCommentRepository;

	constructor(
		issueCommentRepo: IssueCommentRepository,
		prCommentRepo: PRCommentRepository,
	) {
		this.issueCommentRepo = issueCommentRepo;
		this.prCommentRepo = prCommentRepo;
	}

	/**
	 * Create a new comment on an issue
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param issueNumber - Issue number
	 * @param author - Comment author
	 * @param body - Comment text
	 * @returns Created issue comment
	 * @throws {ValidationError} If issue does not exist or data is invalid
	 */
	public async createIssueComment(
		owner: string,
		repo: string,
		issueNumber: number,
		author: string,
		body: string,
	): Promise<IssueCommentResponse> {
		const entity = IssueCommentEntity.fromRequest({
			owner,
			repo_name: repo,
			issue_number: issueNumber,
			author,
			body,
		});

		const createdEntity = await this.issueCommentRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Create a new comment on a pull request
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param prNumber - Pull request number
	 * @param author - Comment author
	 * @param body - Comment text
	 * @returns Created PR comment
	 * @throws {ValidationError} If PR does not exist or data is invalid
	 */
	public async createPRComment(
		owner: string,
		repo: string,
		prNumber: number,
		author: string,
		body: string,
	): Promise<PRCommentResponse> {
		const entity = PRCommentEntity.fromRequest({
			owner,
			repo_name: repo,
			pr_number: prNumber,
			author,
			body,
		});

		const createdEntity = await this.prCommentRepo.create(entity);
		return createdEntity.toResponse();
	}

	/**
	 * List all comments for an issue
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param issueNumber - Issue number
	 * @returns Array of issue comments
	 */
	public async listIssueComments(
		owner: string,
		repo: string,
		issueNumber: number,
	): Promise<IssueCommentResponse[]> {
		const entities = await this.issueCommentRepo.listByIssue(
			owner,
			repo,
			issueNumber,
		);
		return entities.map((entity) => entity.toResponse());
	}

	/**
	 * List all comments for a pull request
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param prNumber - Pull request number
	 * @returns Array of PR comments
	 */
	public async listPRComments(
		owner: string,
		repo: string,
		prNumber: number,
	): Promise<PRCommentResponse[]> {
		const entities = await this.prCommentRepo.listByPR(owner, repo, prNumber);
		return entities.map((entity) => entity.toResponse());
	}

	/**
	 * Update an issue comment
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param issueNumber - Issue number
	 * @param commentId - Comment UUID
	 * @param body - New comment text
	 * @returns Updated issue comment
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async updateIssueComment(
		owner: string,
		repo: string,
		issueNumber: number,
		commentId: string,
		body: string,
	): Promise<IssueCommentResponse> {
		// Get existing comment
		const existingComment = await this.issueCommentRepo.get(
			owner,
			repo,
			issueNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"IssueCommentEntity",
				`COMMENT#${owner}#${repo}#${issueNumber}#${commentId}`,
			);
		}

		// Create updated entity using updateWith pattern
		const updatedEntity = existingComment.updateWith({ body });

		const savedEntity = await this.issueCommentRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Update a PR comment
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param prNumber - Pull request number
	 * @param commentId - Comment UUID
	 * @param body - New comment text
	 * @returns Updated PR comment
	 * @throws {EntityNotFoundError} If comment does not exist
	 */
	public async updatePRComment(
		owner: string,
		repo: string,
		prNumber: number,
		commentId: string,
		body: string,
	): Promise<PRCommentResponse> {
		// Get existing comment
		const existingComment = await this.prCommentRepo.get(
			owner,
			repo,
			prNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"PRCommentEntity",
				`COMMENT#${owner}#${repo}#${prNumber}#${commentId}`,
			);
		}

		// Use entity's updateWith method
		const updatedEntity = existingComment.updateWith({ body });

		const savedEntity = await this.prCommentRepo.update(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Delete an issue comment
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param issueNumber - Issue number
	 * @param commentId - Comment UUID
	 */
	public async deleteIssueComment(
		owner: string,
		repo: string,
		issueNumber: number,
		commentId: string,
	): Promise<void> {
		// Check if comment exists
		const existingComment = await this.issueCommentRepo.get(
			owner,
			repo,
			issueNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"IssueCommentEntity",
				`COMMENT#${owner}#${repo}#${issueNumber}#${commentId}`,
			);
		}

		await this.issueCommentRepo.delete(owner, repo, issueNumber, commentId);
	}

	/**
	 * Delete a PR comment
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param prNumber - Pull request number
	 * @param commentId - Comment UUID
	 */
	public async deletePRComment(
		owner: string,
		repo: string,
		prNumber: number,
		commentId: string,
	): Promise<void> {
		// Check if comment exists
		const existingComment = await this.prCommentRepo.get(
			owner,
			repo,
			prNumber,
			commentId,
		);

		if (!existingComment) {
			throw new EntityNotFoundError(
				"PRCommentEntity",
				`COMMENT#${owner}#${repo}#${prNumber}#${commentId}`,
			);
		}

		await this.prCommentRepo.delete(owner, repo, prNumber, commentId);
	}
}

export { CommentService };
