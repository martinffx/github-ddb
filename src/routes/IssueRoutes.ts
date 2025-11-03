import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	type IssueCreateRequest,
	IssueCreateSchema,
	IssueParamsSchema,
	IssueListParamsSchema,
	IssueListQuerySchema,
	type IssueResponse,
	IssueResponseSchema,
	type IssueUpdateRequest,
	IssueUpdateSchema,
} from "./schema";

/**
 * Issue Routes Plugin
 * Registers all issue-related HTTP endpoints
 */
export const IssueRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get issueService from fastify decorator
	const { issueService } = fastify.services;

	/**
	 * POST /v1/repositories/:owner/:repoName/issues - Create a new issue
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: IssueCreateRequest;
		Reply: IssueResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["Issue"],
				operationId: "createIssue",
				description: "Create a new issue in a repository",
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
	 * GET /v1/repositories/:owner/:repoName/issues/:issueNumber - Retrieve an issue by number
	 */
	fastify.get<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Reply: IssueResponse;
	}>(
		"/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "getIssue",
				description: "Get an issue by number",
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
	 * GET /v1/repositories/:owner/:repoName/issues - List all issues for a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { status?: "open" | "closed" };
		Reply: IssueResponse[];
	}>(
		"/",
		{
			schema: {
				tags: ["Issue"],
				operationId: "listIssues",
				description:
					"List all issues for a repository, optionally filtered by status",
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
	 * PATCH /v1/repositories/:owner/:repoName/issues/:issueNumber - Update an existing issue
	 */
	fastify.patch<{
		Params: { owner: string; repoName: string; issueNumber: string };
		Body: IssueUpdateRequest;
		Reply: IssueResponse;
	}>(
		"/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "updateIssue",
				description: "Update an existing issue",
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
	 * DELETE /v1/repositories/:owner/:repoName/issues/:issueNumber - Delete an issue
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string; issueNumber: string };
	}>(
		"/:issueNumber",
		{
			schema: {
				tags: ["Issue"],
				operationId: "deleteIssue",
				description: "Delete an issue",
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
};
