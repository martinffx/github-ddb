import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	RepositoryCreateSchema,
	RepositoryUpdateSchema,
	RepositoryResponseSchema,
	RepositoryParamsSchema,
	RepositoryListParamsSchema,
	RepositoryListQuerySchema,
	type RepositoryCreateRequest,
	type RepositoryUpdateRequest,
	type RepositoryResponse,
} from "./schema";
import { Type } from "@sinclair/typebox";

interface RepositoryCreateRoute {
	Body: RepositoryCreateRequest;
	Reply: RepositoryResponse;
}

interface RepositoryGetRoute {
	Params: { owner: string; repoName: string };
	Reply: RepositoryResponse;
}

interface RepositoryUpdateRoute {
	Params: { owner: string; repoName: string };
	Body: RepositoryUpdateRequest;
	Reply: RepositoryResponse;
}

interface RepositoryDeleteRoute {
	Params: { owner: string; repoName: string };
}

interface RepositoryListRoute {
	Params: { owner: string };
	Querystring: { limit?: string; offset?: string };
	Reply: {
		items: RepositoryResponse[];
		offset?: string;
	};
}

/**
 * Organziation Routes Plugin
 * Registers all organization-related HTTP endpoints
 */
export const RepositoryRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	const { repositoryService } = fastify.services;

	/**
	 * POST / - Create a new repository
	 */
	fastify.post<RepositoryCreateRoute>(
		"/",
		{
			schema: {
				tags: ["Repository"],
				operationId: "createRepository",
				description: "Create a new repository",
				body: RepositoryCreateSchema,
				response: {
					201: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			// Create repository via service
			const result = await repositoryService.createRepository(request.body);

			// Return 201 Created
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:owner/:repoName - Retrieve a repository by owner and name
	 */
	fastify.get<RepositoryGetRoute>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "getRepository",
				description: "Get a repository by owner and name",
				params: RepositoryParamsSchema,
				response: {
					200: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;

			// Get repository via service
			const result = await repositoryService.getRepository(owner, repoName);

			// Return 200 OK
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:owner/:repoName - Update an existing repository
	 */
	fastify.put<RepositoryUpdateRoute>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "updateRepository",
				description: "Update an existing repository",
				params: RepositoryParamsSchema,
				body: RepositoryUpdateSchema,
				response: {
					200: RepositoryResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;

			// Update repository via service
			const result = await repositoryService.updateRepository(
				owner,
				repoName,
				request.body,
			);

			// Return 200 OK
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:owner/:repoName - Delete a repository
	 */
	fastify.delete<RepositoryDeleteRoute>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Repository"],
				operationId: "deleteRepository",
				description: "Delete a repository",
				params: RepositoryParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;

			// Delete repository via service
			await repositoryService.deleteRepository(owner, repoName);

			// Return 204 No Content
			return reply.code(204).send();
		},
	);

	/**
	 * GET /owner/:owner - List all repositories for an owner
	 */
	fastify.get<RepositoryListRoute>(
		"/owner/:owner",
		{
			schema: {
				tags: ["Repository"],
				operationId: "listRepositoriesByOwner",
				description: "List all repositories for an owner (with pagination)",
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
			const { owner } = request.params;
			const { limit, offset } = request.query;

			// Parse limit to number if provided
			const options: { limit?: number; offset?: string } = {};
			if (limit !== undefined) {
				const parsedLimit = Number.parseInt(limit, 10);
				if (!Number.isNaN(parsedLimit)) {
					options.limit = parsedLimit;
				}
			}
			if (offset !== undefined) {
				options.offset = offset;
			}

			// List repositories via service
			const result = await repositoryService.listRepositoriesByOwner(
				owner,
				options,
			);

			// Return 200 OK
			return reply.code(200).send(result);
		},
	);
};
