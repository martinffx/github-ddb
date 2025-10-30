import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  UserCreateSchema,
  UserUpdateSchema,
  UserResponseSchema,
  UserParamsSchema,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserResponse,
} from "./schema";

interface UserCreateRoute {
  Body: UserCreateRequest;
  Reply: UserResponse;
}

interface UserGetRoute {
  Params: { username: string };
  Reply: UserResponse;
}

interface UserUpdateRoute {
  Params: { username: string };
  Body: UserUpdateRequest;
  Reply: UserResponse;
}

interface UserDeleteRoute {
  Params: { username: string };
}

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
  fastify.post<UserCreateRoute>(
    "/",
    {
      schema: {
        body: UserCreateSchema,
        response: {
          201: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // Create user via service
      const result = await userService.createUser(request.body);

      // Return 201 Created
      return reply.code(201).send(result);
    },
  );

  /**
   * GET /:username - Retrieve a user by username
   */
  fastify.get<UserGetRoute>(
    "/:username",
    {
      schema: {
        params: UserParamsSchema,
        response: {
          200: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { username } = request.params;

      // Get user via service
      const result = await userService.getUser(username);

      // Return 200 OK
      return reply.code(200).send(result);
    },
  );

  /**
   * PUT /:username - Update an existing user
   */
  fastify.put<UserUpdateRoute>(
    "/:username",
    {
      schema: {
        params: UserParamsSchema,
        body: UserUpdateSchema,
        response: {
          200: UserResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { username } = request.params;

      // Update user via service
      const result = await userService.updateUser(username, request.body);

      // Return 200 OK
      return reply.code(200).send(result);
    },
  );

  /**
   * DELETE /:username - Delete a user
   */
  fastify.delete<UserDeleteRoute>(
    "/:username",
    {
      schema: {
        params: UserParamsSchema,
        response: {
          204: { type: "null" },
        },
      },
    },
    async (request, reply) => {
      const { username } = request.params;

      // Delete user via service
      await userService.deleteUser(username);

      // Return 204 No Content
      return reply.code(204).send();
    },
  );
};
