import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	StarParamsSchema,
	StarResponseSchema,
	type StarResponse,
} from "./schema";
import { Type } from "@sinclair/typebox";

/**
 * Star Routes Plugin
 * Registers all star-related HTTP endpoints
 */
export const StarRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get starService from fastify decorator
	const { starService } = fastify.services;

	/**
	 * PUT /:owner/:repoName - Star a repository
	 */
	fastify.put<{
		Params: { owner: string; repoName: string };
		Body: { username: string };
	}>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Star"],
				operationId: "starRepository",
				description: "Star a repository for a user",
				params: StarParamsSchema,
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

			await starService.starRepository(username, owner, repoName);

			return reply.code(204).send();
		},
	);

	/**
	 * DELETE /:owner/:repoName - Unstar a repository
	 */
	fastify.delete<{
		Params: { owner: string; repoName: string };
		Body: { username: string };
	}>(
		"/:owner/:repoName",
		{
			schema: {
				tags: ["Star"],
				operationId: "unstarRepository",
				description: "Unstar a repository for a user",
				params: StarParamsSchema,
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

			await starService.unstarRepository(username, owner, repoName);

			return reply.code(204).send();
		},
	);
};

/**
 * Star User Routes Plugin
 * Registers user-specific star endpoints
 */
export const StarUserRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get starService from fastify decorator
	const { starService } = fastify.services;

	/**
	 * GET /:username/starred - List starred repositories for a user
	 */
	fastify.get<{
		Params: { username: string };
		Reply: StarResponse[];
	}>(
		"/:username/starred",
		{
			schema: {
				tags: ["Star"],
				operationId: "listUserStars",
				description: "List all repositories starred by a user",
				response: {
					200: {
						type: "array",
						items: StarResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { username } = request.params;
			const result = await starService.listUserStars(username);
			return reply.code(200).send(result);
		},
	);
};

/**
 * Star Repository Routes Plugin
 * Registers repository stargazers endpoint
 */
export const StarRepoRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get starService from fastify decorator
	const { starService } = fastify.services;

	/**
	 * GET /:owner/:repoName/stargazers - Check if starred
	 */
	fastify.get<{
		Params: { owner: string; repoName: string };
		Querystring: { username: string };
		Reply: { starred: boolean };
	}>(
		"/:owner/:repoName/stargazers",
		{
			schema: {
				tags: ["Star"],
				operationId: "isStarred",
				description: "Check if a user has starred a repository",
				params: StarParamsSchema,
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

			const starred = await starService.isStarred(username, owner, repoName);

			return reply.code(200).send({ starred });
		},
	);
};
