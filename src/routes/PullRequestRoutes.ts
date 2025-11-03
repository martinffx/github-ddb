import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	type PullRequestCreateRequest,
	PullRequestCreateSchema,
	PullRequestParamsSchema,
	PullRequestListParamsSchema,
	PullRequestListQuerySchema,
	type PullRequestResponse,
	PullRequestResponseSchema,
	type PullRequestUpdateRequest,
	PullRequestUpdateSchema,
} from "./schema";

/**
 * Pull Request Routes Plugin
 * Registers all pull request-related HTTP endpoints
 */
export const PullRequestRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get pullRequestService from fastify decorator
	const { pullRequestService } = fastify.services;

	/**
	 * POST /v1/repositories/:owner/:repoName/pulls - Create a new pull request
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: PullRequestCreateRequest;
		Reply: PullRequestResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "createPullRequest",
				description: "Create a new pull request in a repository",
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
	 * GET /v1/repositories/:owner/:repoName/pulls/:prNumber - Retrieve a pull request by number
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; prNumber: string };
		Reply: PullRequestResponse;
	}>(
		"/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "getPullRequest",
				description: "Get a pull request by number",
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
	 * GET /v1/repositories/:owner/:repoName/pulls - List all pull requests for a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { status?: "open" | "closed" | "merged" };
		Reply: PullRequestResponse[];
	}>(
		"/",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "listPullRequests",
				description:
					"List all pull requests for a repository, optionally filtered by status",
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
	 * PATCH /v1/repositories/:owner/:repoName/pulls/:prNumber - Update an existing pull request
	 */
	fastify.patch<{
		Params: { owner: string; repoName: string; prNumber: string };
		Body: PullRequestUpdateRequest;
		Reply: PullRequestResponse;
	}>(
		"/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "updatePullRequest",
				description: "Update an existing pull request",
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
	 * DELETE /v1/repositories/:owner/:repoName/pulls/:prNumber - Delete a pull request
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string; prNumber: string };
	}>(
		"/:prNumber",
		{
			schema: {
				tags: ["Pull Request"],
				operationId: "deletePullRequest",
				description: "Delete a pull request",
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
};
