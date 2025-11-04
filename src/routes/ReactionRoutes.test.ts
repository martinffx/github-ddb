import {
	describe,
	it,
	expect,
	beforeEach,
	jest,
	afterEach,
} from "@jest/globals";
import { ReactionRoutes } from "./ReactionRoutes";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { ReactionService } from "../services/ReactionService";
import { ReactionEntity } from "../services/entities";
import { ValidationError } from "../shared";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

describe("ReactionRoutes", () => {
	let app: FastifyInstance;
	let mockReactionService: jest.Mocked<ReactionService>;

	beforeEach(async () => {
		mockReactionService = {
			addReaction: jest.fn(),
			removeReaction: jest.fn(),
			listReactions: jest.fn(),
			getReactionsByEmoji: jest.fn(),
		} as unknown as jest.Mocked<ReactionService>;

		app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
		app.decorate("services", {
			reactionService: mockReactionService,
		});

		await app.register(ReactionRoutes, {
			prefix: "/v1/repositories/:owner/:repoName/issues/:issueNumber/reactions",
		});
	});

	afterEach(async () => {
		await app.close();
	});

	describe("POST /v1/repositories/:owner/:repoName/issues/:issueNumber/reactions", () => {
		it("should add a reaction to an issue", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUE",
				targetId: "1",
				user: "user1",
				emoji: "👍",
			});

			mockReactionService.addReaction.mockResolvedValue(
				mockReaction.toResponse(),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions",
				payload: {
					emoji: "👍",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.emoji).toBe("👍");
			expect(body.user).toBe("user1");
			expect(body.target_type).toBe("ISSUE");
			expect(body.target_id).toBe("1");
			expect(mockReactionService.addReaction).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
				"user1",
			);
		});

		it("should return 400 for invalid emoji", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions",
				payload: {
					emoji: "",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it("should return 400 for missing user", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions",
				payload: {
					emoji: "👍",
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it("should return 400 when target does not exist", async () => {
			mockReactionService.addReaction.mockRejectedValue(
				new ValidationError("target", "Target does not exist"),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/issues/999/reactions",
				payload: {
					emoji: "👍",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/issues/:issueNumber/reactions", () => {
		it("should list all reactions for an issue", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}).toResponse(),
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}).toResponse(),
			];

			mockReactionService.listReactions.mockResolvedValue(mockReactions);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions",
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body).toHaveLength(2);
			expect(mockReactionService.listReactions).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"issue",
				"1",
			);
		});

		it("should filter reactions by emoji", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}).toResponse(),
			];

			mockReactionService.getReactionsByEmoji.mockResolvedValue(mockReactions);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions?emoji=%F0%9F%91%8D",
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body).toHaveLength(1);
			expect(body[0].emoji).toBe("👍");
			expect(mockReactionService.getReactionsByEmoji).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
			);
		});

		it("should return empty array when no reactions exist", async () => {
			mockReactionService.listReactions.mockResolvedValue([]);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions",
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body).toEqual([]);
		});
	});

	describe("DELETE /v1/repositories/:owner/:repoName/issues/:issueNumber/reactions/:emoji/:user", () => {
		it("should remove a reaction from an issue", async () => {
			mockReactionService.removeReaction.mockResolvedValue();

			const response = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/owner1/repo1/issues/1/reactions/%F0%9F%91%8D/user1",
			});

			expect(response.statusCode).toBe(204);
			expect(mockReactionService.removeReaction).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
				"user1",
			);
		});
	});

	describe("Polymorphic routes - Pull Requests", () => {
		beforeEach(async () => {
			await app.close();
			app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
			app.decorate("services", {
				reactionService: mockReactionService,
			});

			await app.register(ReactionRoutes, {
				prefix: "/v1/repositories/:owner/:repoName/pulls/:prNumber/reactions",
			});
		});

		it("should add a reaction to a pull request", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PR",
				targetId: "2",
				user: "user1",
				emoji: "🚀",
			});

			mockReactionService.addReaction.mockResolvedValue(
				mockReaction.toResponse(),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/pulls/2/reactions",
				payload: {
					emoji: "🚀",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.emoji).toBe("🚀");
			expect(body.target_type).toBe("PR");
			expect(mockReactionService.addReaction).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"pullrequest",
				"2",
				"🚀",
				"user1",
			);
		});
	});

	describe("Polymorphic routes - Issue Comments", () => {
		beforeEach(async () => {
			await app.close();
			app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
			app.decorate("services", {
				reactionService: mockReactionService,
			});

			await app.register(ReactionRoutes, {
				prefix:
					"/v1/repositories/:owner/:repoName/issues/:issueNumber/comments/:commentId/reactions",
			});
		});

		it("should add a reaction to an issue comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUECOMMENT",
				targetId: "1-comment1",
				user: "user1",
				emoji: "❤️",
			});

			mockReactionService.addReaction.mockResolvedValue(
				mockReaction.toResponse(),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/issues/1/comments/comment1/reactions",
				payload: {
					emoji: "❤️",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.emoji).toBe("❤️");
			expect(body.target_type).toBe("ISSUECOMMENT");
			expect(mockReactionService.addReaction).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"issuecomment",
				"1-comment1",
				"❤️",
				"user1",
			);
		});
	});

	describe("Polymorphic routes - PR Comments", () => {
		beforeEach(async () => {
			await app.close();
			app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
			app.decorate("services", {
				reactionService: mockReactionService,
			});

			await app.register(ReactionRoutes, {
				prefix:
					"/v1/repositories/:owner/:repoName/pulls/:prNumber/comments/:commentId/reactions",
			});
		});

		it("should add a reaction to a PR comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PRCOMMENT",
				targetId: "2-comment1",
				user: "user1",
				emoji: "🎉",
			});

			mockReactionService.addReaction.mockResolvedValue(
				mockReaction.toResponse(),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner1/repo1/pulls/2/comments/comment1/reactions",
				payload: {
					emoji: "🎉",
					user: "user1",
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.emoji).toBe("🎉");
			expect(body.target_type).toBe("PRCOMMENT");
			expect(mockReactionService.addReaction).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"prcomment",
				"2-comment1",
				"🎉",
				"user1",
			);
		});
	});
});
