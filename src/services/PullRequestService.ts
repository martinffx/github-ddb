import type { PullRequestRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	PullRequestCreateRequest,
	PullRequestUpdateRequest,
	PullRequestResponse,
} from "../routes/schema";
import { PullRequestEntity } from "./entities";

class PullRequestService {
	private readonly pullRequestRepo: PullRequestRepository;

	constructor(repo: PullRequestRepository) {
		this.pullRequestRepo = repo;
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
}

export { PullRequestService };
