import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	type ReactionCreateRequest,
	ReactionCreateSchema,
	type ReactionResponse,
	ReactionResponseSchema,
	ReactionListQuerySchema,
} from "./schema";

/**
 * Helper to determine target type and ID from route params
 */
function getTargetInfo(params: Record<string, string>): {
	targetType: "issue" | "pullrequest" | "issuecomment" | "prcomment";
	targetId: string;
} {
	// Check if it's a comment route (has commentId)
	if ("commentId" in params) {
		const commentId = params.commentId;

		// Issue comment route
		if ("issueNumber" in params) {
			return {
				targetType: "issuecomment",
				targetId: `${params.issueNumber}-${commentId}`,
			};
		}

		// PR comment route
		if ("prNumber" in params) {
			return {
				targetType: "prcomment",
				targetId: `${params.prNumber}-${commentId}`,
			};
		}
	}

	// Issue route
	if ("issueNumber" in params) {
		return {
			targetType: "issue",
			targetId: params.issueNumber,
		};
	}

	// PR route
	if ("prNumber" in params) {
		return {
			targetType: "pullrequest",
			targetId: params.prNumber,
		};
	}

	throw new Error("Unable to determine target type from route params");
}

/**
 * Reaction Routes Plugin
 * Registers all reaction-related HTTP endpoints for issues, PRs, and comments
 * This plugin is polymorphic and works for all target types based on the route prefix
 */
export const ReactionRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get reactionService from fastify decorator
	const { reactionService } = fastify.services;

	/**
	 * POST / - Create a reaction on any target (issue, PR, issue comment, PR comment)
	 */
	fastify.post<{
		Params: Record<string, string>;
		Body: ReactionCreateRequest;
		Reply: ReactionResponse;
	}>(
		"/",
		{
			schema: {
				tags: ["Reaction"],
				operationId: "addReaction",
				description: "Add a reaction to an issue, PR, or comment",
				body: ReactionCreateSchema,
				response: {
					201: ReactionResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { emoji, user } = request.body;
			const { targetType, targetId } = getTargetInfo(request.params);

			const result = await reactionService.addReaction(
				owner,
				repoName,
				targetType,
				targetId,
				emoji,
				user,
			);

			return reply.code(201).send(result);
		},
	);

	/**
	 * GET / - List reactions on any target, optionally filtered by emoji
	 */
	fastify.get<{
		Params: Record<string, string>;
		Querystring: { emoji?: string };
		Reply: ReactionResponse[];
	}>(
		"/",
		{
			schema: {
				tags: ["Reaction"],
				operationId: "listReactions",
				description: "List reactions on an issue, PR, or comment",
				querystring: ReactionListQuerySchema,
				response: {
					200: {
						type: "array",
						items: ReactionResponseSchema,
					},
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName } = request.params;
			const { emoji } = request.query;
			const { targetType, targetId } = getTargetInfo(request.params);

			let result: ReactionResponse[];

			if (emoji) {
				result = await reactionService.getReactionsByEmoji(
					owner,
					repoName,
					targetType,
					targetId,
					emoji,
				);
			} else {
				result = await reactionService.listReactions(
					owner,
					repoName,
					targetType,
					targetId,
				);
			}

			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:emoji/:user - Remove a reaction from any target
	 */
	fastify.delete<{
		Params: Record<string, string>;
	}>(
		"/:emoji/:user",
		{
			schema: {
				tags: ["Reaction"],
				operationId: "removeReaction",
				description: "Remove a reaction from an issue, PR, or comment",
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { owner, repoName, emoji, user } = request.params;
			const { targetType, targetId } = getTargetInfo(request.params);

			await reactionService.removeReaction(
				owner,
				repoName,
				targetType,
				targetId,
				emoji,
				user,
			);

			return reply.code(204).send();
		},
	);
};
