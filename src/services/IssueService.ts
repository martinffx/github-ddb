import type { IssueRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	IssueCreateRequest,
	IssueUpdateRequest,
	IssueResponse,
} from "../routes/schema";
import { IssueEntity } from "./entities";

class IssueService {
	private readonly issueRepo: IssueRepository;

	constructor(repo: IssueRepository) {
		this.issueRepo = repo;
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
}

export { IssueService };
