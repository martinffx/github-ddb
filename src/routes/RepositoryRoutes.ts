import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	RepositoryCreateSchema,
	RepositoryUpdateSchema,
	RepositoryResponseSchema,
	RepositoryParamsSchema,
	RepositoryListParamsSchema,
	RepositoryListQuerySchema,
	ForkCreateSchema,
	ForkResponseSchema,
	PullRequestCreateSchema,
	PullRequestParamsSchema,
	PullRequestListParamsSchema,
	PullRequestListQuerySchema,
	PullRequestResponseSchema,
	PullRequestUpdateSchema,
	IssueCreateSchema,
	IssueParamsSchema,
	IssueListParamsSchema,
	IssueListQuerySchema,
	IssueResponseSchema,
	IssueUpdateSchema,
	CommentCreateSchema,
	CommentUpdateSchema,
	PRCommentResponseSchema,
	IssueCommentResponseSchema,
	ReactionCreateSchema,
	ReactionResponseSchema,
	type RepositoryCreateRequest,
	type RepositoryUpdateRequest,
	type RepositoryResponse,
	type ForkCreateRequest,
	type ForkResponse,
	type PullRequestCreateRequest,
	type PullRequestResponse,
	type PullRequestUpdateRequest,
	type IssueCreateRequest,
	type IssueResponse,
	type IssueUpdateRequest,
	type CommentCreateRequest,
	type CommentUpdateRequest,
	type PRCommentResponse,
	type IssueCommentResponse,
	type ReactionCreateRequest,
	type ReactionResponse,
} from "./schema";
import { Type } from "@sinclair/typebox";

/**
 * Repository Routes Plugin
 * Registers all repository-related HTTP endpoints
 */
export const RepositoryRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	const { repositoryService, pullRequestService, issueService } =
		fastify.services;

	/**
	 * POST / - Create a new repository
	 */
	fastify.post<{
		Body: RepositoryCreateRequest;
		Reply: RepositoryResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["Repository"],
				operationId: "createRepository",
				description:
					"Create a new repository under an existing owner (user or organization). The owner must exist before creating the repository. Repository names must be unique within an owner's namespace. Returns 201 with the created repository on success, 400 if validation fails, or 409 if a repository with the same owner/name already exists.",
				body: RepositoryCreateSchema,
				response: {
					201: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await repositoryService.createRepository(request.body);
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName - Retrieve a repository by owner and name
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Reply: RepositoryResponse;
	}>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "getRepository",
				description:
					"Retrieve complete details of a repository by its owner and name. Returns the repository metadata including description, privacy status, primary language, and timestamps. Returns 404 if the repository does not exist.",
				params: RepositoryParamsSchema,
				response: {
					200: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await repositoryService.getRepository(
				request.params.owner,
				request.params.repoName,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName - Update an existing repository
	 */
	fastify.put<{
		Params: { owner: string; repoName: string };
		Body: RepositoryUpdateRequest;
		Reply: RepositoryResponse;
	}>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "updateRepository",
				description:
					"Update mutable fields of an existing repository including description, privacy status (is_private), and primary language. The owner and repo_name are immutable and cannot be changed. Returns the updated repository on success or 404 if the repository does not exist.",
				params: RepositoryParamsSchema,
				body: RepositoryUpdateSchema,
				response: {
					200: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await repositoryService.updateRepository(
				request.params.owner,
				request.params.repoName,
				request.body,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName - Delete a repository
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string };
	}>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "deleteRepository",
				description:
					"Permanently delete a repository. This operation is idempotent - deleting a non-existent repository returns 204 without error. Note: This does not cascade delete related entities (issues, pull requests, etc.) - handle cleanup separately if needed.",
				params: RepositoryParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			await repositoryService.deleteRepository(
				request.params.owner,
				request.params.repoName,
			);
			return reply.code(204).send();
		},
	);

	/**
	 * GET /owner/:owner - List all repositories for an owner
	 */
	fastify.get<{
		Params: { owner: string };
		Querystring: { limit?: string; offset?: string };
		Reply: {
			items: RepositoryResponse[];
			offset?: string;
		};
	}>(
		"/owner/:owner",
		{
			schema: {
				tags: ["Repository"],
				operationId: "listRepositoriesByOwner",
				description:
					"List all repositories owned by a user or organization with pagination support. Results are ordered by creation time (most recent first). Use the 'limit' query parameter to control page size (default 50) and 'offset' for pagination tokens. The response includes an 'offset' field for the next page - omit for the first page, include the returned offset value for subsequent pages.",
				params: RepositoryListParamsSchema,
				querystring: RepositoryListQuerySchema,
				response: {
					200: Type.Object({
						items: Type.Array(RepositoryResponseSchema),
						offset: Type.Optional(Type.String()),
					}),
				},
			},
		},
		async (request, reply) => {
			const options: { limit?: number; offset?: string } = {};
			if (request.query.limit !== undefined) {
				const parsedLimit = Number.parseInt(request.query.limit, 10);
				if (!Number.isNaN(parsedLimit)) {
					options.limit = parsedLimit;
				}
			}
			if (request.query.offset !== undefined) {
				options.offset = request.query.offset;
			}

			const result = await repositoryService.listRepositoriesByOwner(
				request.params.owner,
				options,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName/star - Star a repository
	 */
	fastify.put<{
		Params: { owner: string; repoName: string };
		Body: { username: string };
	}>(
		"/:owner/:repoName/star",
		{
			schema: {
				tags: ["Repository"],
				operationId: "starRepository",
				description:
					"Add a star to a repository on behalf of a user. This operation is idempotent - starring an already-starred repository succeeds without error. The user must exist, and the repository must exist. Returns 204 on success.",
				params: RepositoryParamsSchema,
				body: Type.Object({
					username: Type.String({ minLength: 1 }),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { username } = request.body;

			await repositoryService.starRepository(username, owner, repoName);

			return reply.code(204).send();
		},
	);

	/**
	 * DELETE /:owner/:repoName/star - Unstar a repository
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string };
		Body: { username: string };
	}>(
		"/:owner/:repoName/star",
		{
			schema: {
				tags: ["Repository"],
				operationId: "unstarRepository",
				description:
					"Remove a star from a repository for a user. This operation is idempotent - unstarring a repository that isn't starred succeeds without error. Returns 204 on success.",
				params: RepositoryParamsSchema,
				body: Type.Object({
					username: Type.String({ minLength: 1 }),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { username } = request.body;

			await repositoryService.unstarRepository(username, owner, repoName);

			return reply.code(204).send();
		},
	);

	/**
	 * GET /:owner/:repoName/star - Check if repository is starred
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { username: string };
		Reply: { starred: boolean };
	}>(
		"/:owner/:repoName/star",
		{
			schema: {
				tags: ["Repository"],
				operationId: "isStarred",
				description:
					"Check whether a specific user has starred a repository. Returns a boolean indicating the starred status. This is useful for displaying UI state (e.g., filled vs. unfilled star icon).",
				params: RepositoryParamsSchema,
				querystring: Type.Object({
					username: Type.String({ minLength: 1 }),
				}),
				response: {
					200: {
						type: "object",
						properties: {
							starred: { type: "boolean" },
						},
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { username } = request.query;

			const starred = await repositoryService.isStarred(
				username,
				owner,
				repoName,
			);

			return reply.code(200).send({ starred });
		},
	);

	/**
	 * POST /:owner/:repoName/forks - Create a fork
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: ForkCreateRequest;
		Reply: ForkResponse;
	}>(
		"/:owner/:repoName/forks",
		{
			schema: {
				tags: ["Fork"],
				operationId: "createFork",
				description:
					"Create a fork relationship between an original repository and a forked repository. Both repositories must already exist - this endpoint creates the relationship record, not the forked repository itself. The fork_owner and fork_repo specify the destination. Returns 201 with fork details on success.",
				params: RepositoryParamsSchema,
				body: ForkCreateSchema,
				response: {
					201: ForkResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { fork_owner, fork_repo } = request.body;

			const result = await repositoryService.createFork(
				owner,
				repoName,
				fork_owner,
				fork_repo,
			);

			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/forks - List forks of a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Reply: ForkResponse[];
	}>(
		"/:owner/:repoName/forks",
		{
			schema: {
				tags: ["Fork"],
				operationId: "listForks",
				description:
					"Retrieve all fork relationships for a repository. Returns an array of fork records showing which repositories have forked from this one, including the fork owner, fork repository name, and creation timestamp.",
				params: RepositoryParamsSchema,
				response: {
					200: {
						type: "array",
						items: ForkResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;

			const result = await repositoryService.listForks(owner, repoName);

			return reply.code(200).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/forks/:forkOwner - Get a specific fork
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; forkOwner: string };
		Reply: ForkResponse;
	}>(
		"/:owner/:repoName/forks/:forkOwner",
		{
			schema: {
				tags: ["Fork"],
				operationId: "getFork",
				description:
					"Retrieve a specific fork relationship by the fork owner. This looks up the fork record where the specified forkOwner has forked the original repository. Assumes the forked repository has the same name as the original. Returns 404 if the fork relationship does not exist.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					forkOwner: Type.String(),
				}),
				response: {
					200: ForkResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, forkOwner } = request.params;

			// For getFork, we need to construct the forked repo name
			// Assuming forked repo has same name as source
			const result = await repositoryService.getFork(
				owner,
				repoName,
				forkOwner,
				repoName,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/forks/:forkOwner - Delete a fork
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string; forkOwner: string };
	}>(
		"/:owner/:repoName/forks/:forkOwner",
		{
			schema: {
				tags: ["Fork"],
				operationId: "deleteFork",
				description:
					"Delete a fork relationship record. This removes the fork relationship metadata but does not delete the forked repository itself. Returns 204 on success.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					forkOwner: Type.String(),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, forkOwner } = request.params;

			await repositoryService.deleteFork(owner, repoName, forkOwner, repoName);

			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/pr - Create a new pull request
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: PullRequestCreateRequest;
		Reply: PullRequestResponse;
	}>(
		"/:owner/:repoName/pr",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "createPullRequest",
				description:
					"Create a new pull request in a repository. The PR is automatically assigned a sequential number. Requires title, author, source_branch, and target_branch. Status defaults to 'open' if not specified. The repository must exist. Returns 201 with the created pull request including the assigned pr_number.",
				params: PullRequestListParamsSchema,
				body: PullRequestCreateSchema,
				response: {
					201: PullRequestResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const result = await pullRequestService.createPullRequest(
				owner,
				repoName,
				request.body,
			);
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/pr/:prNumber - Retrieve a pull request by number
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; prNumber: string };
		Reply: PullRequestResponse;
	}>(
		"/:owner/:repoName/pr/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "getPullRequest",
				description:
					"Retrieve complete details of a pull request by its number within a repository. Returns all PR metadata including title, body, status (open/closed/merged), author, branch information, and timestamps. Returns 404 if the pull request does not exist.",
				params: PullRequestParamsSchema,
				response: {
					200: PullRequestResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			const result = await pullRequestService.getPullRequest(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/pr - List all pull requests for a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { status?: "open" | "closed" | "merged" };
		Reply: PullRequestResponse[];
	}>(
		"/:owner/:repoName/pr",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "listPullRequests",
				description:
					"List all pull requests for a repository with optional status filtering. Use the 'status' query parameter to filter by 'open', 'closed', or 'merged'. Omit the status parameter to retrieve all pull requests regardless of status. Results are ordered by PR number.",
				params: PullRequestListParamsSchema,
				querystring: PullRequestListQuerySchema,
				response: {
					200: {
						type: "array",
						items: PullRequestResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { status } = request.query;
			const result = await pullRequestService.listPullRequests(
				owner,
				repoName,
				status,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName/pr/:prNumber - Update an existing pull request
	 */
	fastify.put<{
		Params: { owner: string; repoName: string; prNumber: string };
		Body: PullRequestUpdateRequest;
		Reply: PullRequestResponse;
	}>(
		"/:owner/:repoName/pr/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "updatePullRequest",
				description:
					"Update mutable fields of an existing pull request including title, body, status, branch information, and merge_commit_sha. The pr_number, owner, repo_name, and author are immutable. Use this to close/reopen PRs by changing status, or to record merge information. Returns the updated PR or 404 if not found.",
				params: PullRequestParamsSchema,
				body: PullRequestUpdateSchema,
				response: {
					200: PullRequestResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			const result = await pullRequestService.updatePullRequest(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				request.body,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/pr/:prNumber - Delete a pull request
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string; prNumber: string };
	}>(
		"/:owner/:repoName/pr/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "deletePullRequest",
				description:
					"Permanently delete a pull request. This operation is idempotent - deleting a non-existent PR returns 204. Note: Consider updating status to 'closed' instead of deletion to preserve history.",
				params: PullRequestParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			await pullRequestService.deletePullRequest(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
			);
			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/pr/:prNumber/comments - Create a comment on a pull request
	 */
	fastify.post<{
		Params: { owner: string; repoName: string; prNumber: string };
		Body: CommentCreateRequest;
		Reply: PRCommentResponse;
	}>(
		"/:owner/:repoName/pr/:prNumber/comments",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "createPRComment",
				description:
					"Add a comment to a pull request. Requires author (username) and body (comment text). The comment is automatically assigned a unique ID. The pull request must exist. Returns 201 with the created comment including its ID and timestamp.",
				params: PullRequestParamsSchema,
				body: CommentCreateSchema,
				response: {
					201: PRCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			const { author, body } = request.body;

			const result = await pullRequestService.createComment(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				author,
				body,
			);

			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/pr/:prNumber/comments - List comments on a pull request
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; prNumber: string };
		Reply: PRCommentResponse[];
	}>(
		"/:owner/:repoName/pr/:prNumber/comments",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "listPRComments",
				description:
					"Retrieve all comments on a pull request, ordered by creation time (oldest first). Returns an array of comments including author, body, and timestamps. Returns an empty array if no comments exist.",
				params: PullRequestParamsSchema,
				response: {
					200: {
						type: "array",
						items: PRCommentResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;

			const result = await pullRequestService.listComments(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/pr/:prNumber/comments/:commentId - Get a specific comment
	 */
	fastify.get<{
		Params: {
			owner: string;
			repoName: string;
			prNumber: string;
			commentId: string;
		};
		Reply: PRCommentResponse;
	}>(
		"/:owner/:repoName/pr/:prNumber/comments/:commentId",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "getPRComment",
				description:
					"Retrieve a specific comment on a pull request by its unique comment ID. Returns the comment details including author, body, and timestamps. Returns 404 if the comment does not exist.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					prNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				response: {
					200: PRCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber, commentId } = request.params;

			const result = await pullRequestService.getComment(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				commentId,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName/pr/:prNumber/comments/:commentId - Update a comment
	 */
	fastify.put<{
		Params: {
			owner: string;
			repoName: string;
			prNumber: string;
			commentId: string;
		};
		Body: CommentUpdateRequest;
		Reply: PRCommentResponse;
	}>(
		"/:owner/:repoName/pr/:prNumber/comments/:commentId",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "updatePRComment",
				description:
					"Update the body text of an existing pull request comment. The author and comment ID are immutable. Updates the updated_at timestamp. Returns the updated comment or 404 if not found.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					prNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				body: CommentUpdateSchema,
				response: {
					200: PRCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber, commentId } = request.params;
			const { body } = request.body;

			const result = await pullRequestService.updateComment(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				commentId,
				body,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/pr/:prNumber/comments/:commentId - Delete a comment
	 */
	fastify.delete<{
		Params: {
			owner: string;
			repoName: string;
			prNumber: string;
			commentId: string;
		};
	}>(
		"/:owner/:repoName/pr/:prNumber/comments/:commentId",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "deletePRComment",
				description:
					"Permanently delete a comment from a pull request. This operation is idempotent - deleting a non-existent comment returns 204. Returns 204 on success.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					prNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber, commentId } = request.params;

			await pullRequestService.deleteComment(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				commentId,
			);

			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/pr/:prNumber/reactions - Add a reaction to a pull request
	 */
	fastify.post<{
		Params: { owner: string; repoName: string; prNumber: string };
		Body: ReactionCreateRequest;
	}>(
		"/:owner/:repoName/pr/:prNumber/reactions",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "addPRReaction",
				description:
					"Add an emoji reaction to a pull request. Requires an emoji (e.g., '👍', '❤️', '🎉') and a user identifier. Multiple users can add the same emoji. The pull request must exist. Returns 204 on success.",
				params: PullRequestParamsSchema,
				body: ReactionCreateSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			const { emoji, user } = request.body;

			await pullRequestService.addReaction(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				emoji,
				user,
			);

			return reply.code(204).send();
		},
	);

	/**
	 * GET /:owner/:repoName/pr/:prNumber/reactions - List reactions on a pull request
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; prNumber: string };
		Querystring: { limit?: string };
		Reply: ReactionResponse[];
	}>(
		"/:owner/:repoName/pr/:prNumber/reactions",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "listPRReactions",
				description:
					"Retrieve all emoji reactions on a pull request. Use the optional 'limit' query parameter to restrict the number of results returned. Returns reactions with emoji, user, and timestamp information. Returns an empty array if no reactions exist.",
				params: PullRequestParamsSchema,
				querystring: Type.Object({
					limit: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
				}),
				response: {
					200: {
						type: "array",
						items: ReactionResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber } = request.params;
			const limit = request.query.limit
				? Number.parseInt(request.query.limit, 10)
				: undefined;

			const result = await pullRequestService.listReactions(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				limit,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/pr/:prNumber/reactions/:emoji - Remove a reaction from a pull request
	 */
	fastify.delete<{
		Params: {
			owner: string;
			repoName: string;
			prNumber: string;
			emoji: string;
		};
		Body: { user_id: string };
	}>(
		"/:owner/:repoName/pr/:prNumber/reactions/:emoji",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "removePRReaction",
				description:
					"Remove a specific emoji reaction from a pull request for a given user. The emoji is specified in the URL path, and the user_id in the request body. This operation is idempotent - removing a non-existent reaction returns 204. Returns 204 on success.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					prNumber: Type.String({ pattern: "^[0-9]+$" }),
					emoji: Type.String(),
				}),
				body: Type.Object({
					user_id: Type.String(),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, prNumber, emoji } = request.params;
			const { user_id: user } = request.body;

			await pullRequestService.removeReaction(
				owner,
				repoName,
				Number.parseInt(prNumber, 10),
				emoji,
				user,
			);

			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/issues - Create a new issue
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: IssueCreateRequest;
		Reply: IssueResponse;
	}>(
		"/:owner/:repoName/issues",
		{
			schema: {
				tags: ["Issue"],
				operationId: "createIssue",
				description:
					"Create a new issue in a repository. The issue is automatically assigned a sequential number. Requires title and author. Status defaults to 'open' if not specified. The repository must exist. Returns 201 with the created issue including the assigned issue_number.",
				params: IssueListParamsSchema,
				body: IssueCreateSchema,
				response: {
					201: IssueResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const result = await issueService.createIssue(
				owner,
				repoName,
				request.body,
			);
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/issues/:issueNumber - Retrieve an issue by number
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Reply: IssueResponse;
	}>(
		"/:owner/:repoName/issues/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "getIssue",
				description:
					"Retrieve complete details of an issue by its number within a repository. Returns all issue metadata including title, body, status (open/closed), author, and timestamps. Returns 404 if the issue does not exist.",
				params: IssueParamsSchema,
				response: {
					200: IssueResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			const result = await issueService.getIssue(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/issues - List all issues for a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { status?: "open" | "closed" };
		Reply: IssueResponse[];
	}>(
		"/:owner/:repoName/issues",
		{
			schema: {
				tags: ["Issue"],
				operationId: "listIssues",
				description:
					"List all issues for a repository with optional status filtering. Use the 'status' query parameter to filter by 'open' or 'closed'. Omit the status parameter to retrieve all issues regardless of status. Results are ordered by issue number.",
				params: IssueListParamsSchema,
				querystring: IssueListQuerySchema,
				response: {
					200: {
						type: "array",
						items: IssueResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { status } = request.query;
			const result = await issueService.listIssues(owner, repoName, status);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName/issues/:issueNumber - Update an existing issue
	 */
	fastify.put<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Body: IssueUpdateRequest;
		Reply: IssueResponse;
	}>(
		"/:owner/:repoName/issues/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "updateIssue",
				description:
					"Update mutable fields of an existing issue including title, body, and status. The issue_number, owner, repo_name, and author are immutable. Use this to close/reopen issues by changing status. Returns the updated issue or 404 if not found.",
				params: IssueParamsSchema,
				body: IssueUpdateSchema,
				response: {
					200: IssueResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			const result = await issueService.updateIssue(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				request.body,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/issues/:issueNumber - Delete an issue
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string; issueNumber: string };
	}>(
		"/:owner/:repoName/issues/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "deleteIssue",
				description:
					"Permanently delete an issue. This operation is idempotent - deleting a non-existent issue returns 204. Note: Consider updating status to 'closed' instead of deletion to preserve history.",
				params: IssueParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			await issueService.deleteIssue(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
			);
			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/issues/:issueNumber/comments - Create a comment on an issue
	 */
	fastify.post<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Body: CommentCreateRequest;
		Reply: IssueCommentResponse;
	}>(
		"/:owner/:repoName/issues/:issueNumber/comments",
		{
			schema: {
				tags: ["Issue"],
				operationId: "createIssueComment",
				description:
					"Add a comment to an issue. Requires author (username) and body (comment text). The comment is automatically assigned a unique ID. The issue must exist. Returns 201 with the created comment including its ID and timestamp.",
				params: IssueParamsSchema,
				body: CommentCreateSchema,
				response: {
					201: IssueCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			const { author, body } = request.body;

			const result = await issueService.createComment(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				author,
				body,
			);

			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/issues/:issueNumber/comments - List comments on an issue
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Reply: IssueCommentResponse[];
	}>(
		"/:owner/:repoName/issues/:issueNumber/comments",
		{
			schema: {
				tags: ["Issue"],
				operationId: "listIssueComments",
				description:
					"Retrieve all comments on an issue, ordered by creation time (oldest first). Returns an array of comments including author, body, and timestamps. Returns an empty array if no comments exist.",
				params: IssueParamsSchema,
				response: {
					200: {
						type: "array",
						items: IssueCommentResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;

			const result = await issueService.listComments(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName/issues/:issueNumber/comments/:commentId - Get a specific comment
	 */
	fastify.get<{
		Params: {
			owner: string;
			repoName: string;
			issueNumber: string;
			commentId: string;
		};
		Reply: IssueCommentResponse;
	}>(
		"/:owner/:repoName/issues/:issueNumber/comments/:commentId",
		{
			schema: {
				tags: ["Issue"],
				operationId: "getIssueComment",
				description:
					"Retrieve a specific comment on an issue by its unique comment ID. Returns the comment details including author, body, and timestamps. Returns 404 if the comment does not exist.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					issueNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				response: {
					200: IssueCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber, commentId } = request.params;

			const result = await issueService.getComment(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				commentId,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName/issues/:issueNumber/comments/:commentId - Update a comment
	 */
	fastify.put<{
		Params: {
			owner: string;
			repoName: string;
			issueNumber: string;
			commentId: string;
		};
		Body: CommentUpdateRequest;
		Reply: IssueCommentResponse;
	}>(
		"/:owner/:repoName/issues/:issueNumber/comments/:commentId",
		{
			schema: {
				tags: ["Issue"],
				operationId: "updateIssueComment",
				description:
					"Update the body text of an existing issue comment. The author and comment ID are immutable. Updates the updated_at timestamp. Returns the updated comment or 404 if not found.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					issueNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				body: CommentUpdateSchema,
				response: {
					200: IssueCommentResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber, commentId } = request.params;
			const { body } = request.body;

			const result = await issueService.updateComment(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				commentId,
				body,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/issues/:issueNumber/comments/:commentId - Delete a comment
	 */
	fastify.delete<{
		Params: {
			owner: string;
			repoName: string;
			issueNumber: string;
			commentId: string;
		};
	}>(
		"/:owner/:repoName/issues/:issueNumber/comments/:commentId",
		{
			schema: {
				tags: ["Issue"],
				operationId: "deleteIssueComment",
				description:
					"Permanently delete a comment from an issue. This operation is idempotent - deleting a non-existent comment returns 204. Returns 204 on success.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					issueNumber: Type.String({ pattern: "^[0-9]+$" }),
					commentId: Type.String(),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber, commentId } = request.params;

			await issueService.deleteComment(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				commentId,
			);

			return reply.code(204).send();
		},
	);

	/**
	 * POST /:owner/:repoName/issues/:issueNumber/reactions - Add a reaction to an issue
	 */
	fastify.post<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Body: ReactionCreateRequest;
	}>(
		"/:owner/:repoName/issues/:issueNumber/reactions",
		{
			schema: {
				tags: ["Issue"],
				operationId: "addIssueReaction",
				description:
					"Add an emoji reaction to an issue. Requires an emoji (e.g., '👍', '❤️', '🎉') and a user identifier. Multiple users can add the same emoji. The issue must exist. Returns 204 on success.",
				params: IssueParamsSchema,
				body: ReactionCreateSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			const { emoji, user } = request.body;

			await issueService.addReaction(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				emoji,
				user,
			);

			return reply.code(204).send();
		},
	);

	/**
	 * GET /:owner/:repoName/issues/:issueNumber/reactions - List reactions on an issue
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Querystring: { limit?: string };
		Reply: ReactionResponse[];
	}>(
		"/:owner/:repoName/issues/:issueNumber/reactions",
		{
			schema: {
				tags: ["Issue"],
				operationId: "listIssueReactions",
				description:
					"Retrieve all emoji reactions on an issue. Use the optional 'limit' query parameter to restrict the number of results returned. Returns reactions with emoji, user, and timestamp information. Returns an empty array if no reactions exist.",
				params: IssueParamsSchema,
				querystring: Type.Object({
					limit: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
				}),
				response: {
					200: {
						type: "array",
						items: ReactionResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber } = request.params;
			const limit = request.query.limit
				? Number.parseInt(request.query.limit, 10)
				: undefined;

			const result = await issueService.listReactions(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				limit,
			);

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName/issues/:issueNumber/reactions/:emoji - Remove a reaction from an issue
	 */
	fastify.delete<{
		Params: {
			owner: string;
			repoName: string;
			issueNumber: string;
			emoji: string;
		};
		Body: { user_id: string };
	}>(
		"/:owner/:repoName/issues/:issueNumber/reactions/:emoji",
		{
			schema: {
				tags: ["Issue"],
				operationId: "removeIssueReaction",
				description:
					"Remove a specific emoji reaction from an issue for a given user. The emoji is specified in the URL path, and the user_id in the request body. This operation is idempotent - removing a non-existent reaction returns 204. Returns 204 on success.",
				params: Type.Object({
					owner: Type.String(),
					repoName: Type.String(),
					issueNumber: Type.String({ pattern: "^[0-9]+$" }),
					emoji: Type.String(),
				}),
				body: Type.Object({
					user_id: Type.String(),
				}),
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, issueNumber, emoji } = request.params;
			const { user_id: user } = request.body;

			await issueService.removeReaction(
				owner,
				repoName,
				Number.parseInt(issueNumber, 10),
				emoji,
				user,
			);

			return reply.code(204).send();
		},
	);
};
