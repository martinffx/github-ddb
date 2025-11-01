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

/**
 * Repository Routes Plugin
 * Registers all repository-related HTTP endpoints
 */
export const RepositoryRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	const { repositoryService } = fastify.services;

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
				description: "Create a new repository",
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
				description: "Get a repository by owner and name",
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
				description: "Update an existing repository",
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
				description: "Delete a repository",
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
};
