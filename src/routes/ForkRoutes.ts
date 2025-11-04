import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	ForkCreateSchema,
	ForkListParamsSchema,
	ForkParamsSchema,
	ForkResponseSchema,
	type ForkResponse,
} from "./schema";

/**
 * Fork Routes Plugin
 * Registers all fork-related HTTP endpoints
 */
export const ForkRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get forkService from fastify decorator
	const { forkService } = fastify.services;

	/**
	 * POST /v1/repositories/:owner/:repoName/forks - Create a new fork
	 */
	fastify.post<{
		Params: { owner: string; repoName: string };
		Body: { fork_owner: string; fork_repo: string };
		Reply: ForkResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["Fork"],
				operationId: "createFork",
				description: "Create a fork of a repository",
				params: ForkListParamsSchema,
				body: ForkCreateSchema,
				response: {
					201: ForkResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { fork_owner, fork_repo } = request.body;

			const result = await forkService.createFork(
				owner,
				repoName,
				fork_owner,
				fork_repo,
			);

			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /v1/repositories/:owner/:repoName/forks - List forks of a repository
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Reply: ForkResponse[];
	}>(
		"/",
		{
			schema: {
				tags: ["Fork"],
				operationId: "listForks",
				description: "List all forks of a repository",
				params: ForkListParamsSchema,
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
			const result = await forkService.listForks(owner, repoName);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /v1/repositories/:owner/:repoName/forks/:forkedOwner/:forkedRepo - Delete a fork
	 */
	fastify.delete<{
		Params: {
			owner: string;
			repoName: string;
			forkedOwner: string;
			forkedRepo: string;
		};
	}>(
		"/:forkedOwner/:forkedRepo",
		{
			schema: {
				tags: ["Fork"],
				operationId: "deleteFork",
				description: "Delete a fork relationship",
				params: ForkParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, forkedOwner, forkedRepo } = request.params;
			await forkService.deleteFork(owner, repoName, forkedOwner, forkedRepo);
			return reply.code(204).send();
		},
	);
};
