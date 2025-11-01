import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	type UserCreateRequest,
	UserCreateSchema,
	UserParamsSchema,
	type UserResponse,
	UserResponseSchema,
	type UserUpdateRequest,
	UserUpdateSchema,
} from "./schema";

/**
 * User Routes Plugin
 * Registers all user-related HTTP endpoints
 */
export const UserRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get userService from fastify decorator
	const { userService } = fastify.services;

	/**
	 * POST / - Create a new user
	 */
	fastify.post<{
		Body: UserCreateRequest;
		Reply: UserResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["User"],
				operationId: "createUser",
				description: "Create a new user",
				body: UserCreateSchema,
				response: {
					201: UserResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await userService.createUser(request.body);
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:username - Retrieve a user by username
	 */
	fastify.get<{
		Params: { username: string };
		Reply: UserResponse;
	}>(
		"/:username",
		{
			schema: {
				tags: ["User"],
				operationId: "getUser",
				description: "Get a user by username",
				params: UserParamsSchema,
				response: {
					200: UserResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await userService.getUser(request.params.username);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:username - Update an existing user
	 */
	fastify.put<{
		Params: { username: string };
		Body: UserUpdateRequest;
		Reply: UserResponse;
	}>(
		"/:username",
		{
			schema: {
				tags: ["User"],
				operationId: "updateUser",
				description: "Update an existing user",
				params: UserParamsSchema,
				body: UserUpdateSchema,
				response: {
					200: UserResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await userService.updateUser(
				request.params.username,
				request.body,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:username - Delete a user
	 */
	fastify.delete<{
		Params: { username: string };
	}>(
		"/:username",
		{
			schema: {
				tags: ["User"],
				operationId: "deleteUser",
				description: "Delete a user",
				params: UserParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			await userService.deleteUser(request.params.username);
			return reply.code(204).send();
		},
	);
};
