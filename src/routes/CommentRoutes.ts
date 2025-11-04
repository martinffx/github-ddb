import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  type CommentCreateRequest,
  CommentCreateSchema,
  type CommentUpdateRequest,
  CommentUpdateSchema,
  type IssueCommentResponse,
  IssueCommentResponseSchema,
  type PRCommentResponse,
} from "./schema";

/**
 * Comment Routes Plugin
 *
 * POLYMORPHIC DESIGN:
 * This plugin handles both Issue comments and PR comments based on route registration.
 *
 * When registered under `issues/:issueNumber/comments`:
 *   - Handles issue comment operations (create, list, update, delete)
 *   - Route params include `issueNumber`
 *
 * When registered under `pulls/:prNumber/comments`:
 *   - Handles PR comment operations (create, list, update, delete)
 *   - Route params include `prNumber`
 *
 * The plugin inspects URL parameters to determine whether it's operating on
 * issue comments or PR comments, then delegates to the appropriate service methods.
 *
 * @example
 * // Issue comments
 * app.register(CommentRoutes, {
 *   prefix: "/v1/repositories/:owner/:repoName/issues/:issueNumber/comments"
 * });
 *
 * // PR comments
 * app.register(CommentRoutes, {
 *   prefix: "/v1/repositories/:owner/:repoName/pulls/:prNumber/comments"
 * });
 */
export const CommentRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // Get commentService from fastify decorator
  const { commentService } = fastify.services;

  /**
   * POST /v1/repositories/:owner/:repoName/issues/:issueNumber/comments
   * POST /v1/repositories/:owner/:repoName/pulls/:prNumber/comments
   * Create a new comment (on issue or PR depending on route)
   */
  fastify.post<{
    Params: {
      owner: string;
      repoName: string;
      issueNumber?: string;
      prNumber?: string;
    };
    Body: CommentCreateRequest;
    Reply: IssueCommentResponse | PRCommentResponse;
  }>(
    "/",
    {
      schema: {
        tags: ["Comment"],
        operationId: "createComment",
        description: "Create a new comment",
        body: CommentCreateSchema,
        response: {
          201: IssueCommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { owner, repoName, issueNumber, prNumber } = request.params;
      const { author, body } = request.body;

      // Determine if this is an issue or PR comment based on params
      if (issueNumber) {
        const result = await commentService.createIssueComment(
          owner,
          repoName,
          Number.parseInt(issueNumber, 10),
          author,
          body,
        );
        return reply.code(201).send(result);
      } else if (prNumber) {
        const result = await commentService.createPRComment(
          owner,
          repoName,
          Number.parseInt(prNumber, 10),
          author,
          body,
        );
        return reply.code(201).send(result);
      }

      return reply.code(400).send({ error: "Missing issueNumber or prNumber" });
    },
  );

  /**
   * GET /v1/repositories/:owner/:repoName/issues/:issueNumber/comments
   * GET /v1/repositories/:owner/:repoName/pulls/:prNumber/comments
   * List all comments (for issue or PR depending on route)
   */
  fastify.get<{
    Params: {
      owner: string;
      repoName: string;
      issueNumber?: string;
      prNumber?: string;
    };
    Reply: IssueCommentResponse[] | PRCommentResponse[];
  }>(
    "/",
    {
      schema: {
        tags: ["Comment"],
        operationId: "listComments",
        description: "List all comments",
        response: {
          200: {
            type: "array",
            items: IssueCommentResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { owner, repoName, issueNumber, prNumber } = request.params;

      // Determine if this is an issue or PR comment based on params
      if (issueNumber) {
        const result = await commentService.listIssueComments(
          owner,
          repoName,
          Number.parseInt(issueNumber, 10),
        );
        return reply.code(200).send(result);
      } else if (prNumber) {
        const result = await commentService.listPRComments(
          owner,
          repoName,
          Number.parseInt(prNumber, 10),
        );
        return reply.code(200).send(result);
      }

      return reply.code(400).send({ error: "Missing issueNumber or prNumber" });
    },
  );

  /**
   * PATCH /v1/repositories/:owner/:repoName/issues/:issueNumber/comments/:commentId
   * PATCH /v1/repositories/:owner/:repoName/pulls/:prNumber/comments/:commentId
   * Update a comment (issue or PR depending on route)
   */
  fastify.patch<{
    Params: {
      owner: string;
      repoName: string;
      issueNumber?: string;
      prNumber?: string;
      commentId: string;
    };
    Body: CommentUpdateRequest;
    Reply: IssueCommentResponse | PRCommentResponse;
  }>(
    "/:commentId",
    {
      schema: {
        tags: ["Comment"],
        operationId: "updateComment",
        description: "Update a comment",
        body: CommentUpdateSchema,
        response: {
          200: IssueCommentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { owner, repoName, issueNumber, prNumber, commentId } =
        request.params;
      const { body } = request.body;

      // Determine if this is an issue or PR comment based on params
      if (issueNumber) {
        const result = await commentService.updateIssueComment(
          owner,
          repoName,
          Number.parseInt(issueNumber, 10),
          commentId,
          body,
        );
        return reply.code(200).send(result);
      } else if (prNumber) {
        const result = await commentService.updatePRComment(
          owner,
          repoName,
          Number.parseInt(prNumber, 10),
          commentId,
          body,
        );
        return reply.code(200).send(result);
      }

      return reply.code(400).send({ error: "Missing issueNumber or prNumber" });
    },
  );

  /**
   * DELETE /v1/repositories/:owner/:repoName/issues/:issueNumber/comments/:commentId
   * DELETE /v1/repositories/:owner/:repoName/pulls/:prNumber/comments/:commentId
   * Delete a comment (issue or PR depending on route)
   */
  fastify.delete<{
    Params: {
      owner: string;
      repoName: string;
      issueNumber?: string;
      prNumber?: string;
      commentId: string;
    };
  }>(
    "/:commentId",
    {
      schema: {
        tags: ["Comment"],
        operationId: "deleteComment",
        description: "Delete a comment",
        response: {
          204: { type: "null" },
        },
      },
    },
    async (request, reply) => {
      const { owner, repoName, issueNumber, prNumber, commentId } =
        request.params;

      // Determine if this is an issue or PR comment based on params
      if (issueNumber) {
        await commentService.deleteIssueComment(
          owner,
          repoName,
          Number.parseInt(issueNumber, 10),
          commentId,
        );
        return reply.code(204).send();
      } else if (prNumber) {
        await commentService.deletePRComment(
          owner,
          repoName,
          Number.parseInt(prNumber, 10),
          commentId,
        );
        return reply.code(204).send();
      }

      return reply.code(400).send({ error: "Missing issueNumber or prNumber" });
    },
  );
};
