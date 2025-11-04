import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ReactionService } from "./ReactionService";
import type { ReactionRepository } from "../repos";
import { ReactionEntity } from "./entities";
import { ValidationError } from "../shared";

describe("ReactionService", () => {
	let reactionService: ReactionService;
	let mockReactionRepo: jest.Mocked<ReactionRepository>;

	beforeEach(() => {
		mockReactionRepo = {
			create: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			listByTarget: jest.fn(),
			getByUserAndTarget: jest.fn(),
		} as unknown as jest.Mocked<ReactionRepository>;

		reactionService = new ReactionService(mockReactionRepo);
	});

	describe("addReaction", () => {
		it("should add reaction to an issue", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUE",
				targetId: "1",
				user: "user1",
				emoji: "👍",
			});

			mockReactionRepo.create.mockResolvedValue(mockReaction);

			const result = await reactionService.addReaction(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
				"user1",
			);

			expect(result).toEqual(mockReaction.toResponse());
			expect(mockReactionRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
			);
		});

		it("should add reaction to a pull request", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PR",
				targetId: "2",
				user: "user1",
				emoji: "🎉",
			});

			mockReactionRepo.create.mockResolvedValue(mockReaction);

			const result = await reactionService.addReaction(
				"owner1",
				"repo1",
				"pullrequest",
				"2",
				"🎉",
				"user1",
			);

			expect(result).toEqual(mockReaction.toResponse());
		});

		it("should add reaction to an issue comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUECOMMENT",
				targetId: "1-comment1",
				user: "user1",
				emoji: "❤️",
			});

			mockReactionRepo.create.mockResolvedValue(mockReaction);

			const result = await reactionService.addReaction(
				"owner1",
				"repo1",
				"issuecomment",
				"1-comment1",
				"❤️",
				"user1",
			);

			expect(result).toEqual(mockReaction.toResponse());
		});

		it("should add reaction to a PR comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PRCOMMENT",
				targetId: "2-comment1",
				user: "user1",
				emoji: "🚀",
			});

			mockReactionRepo.create.mockResolvedValue(mockReaction);

			const result = await reactionService.addReaction(
				"owner1",
				"repo1",
				"prcomment",
				"2-comment1",
				"🚀",
				"user1",
			);

			expect(result).toEqual(mockReaction.toResponse());
		});

		it("should throw ValidationError when target does not exist", async () => {
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("target", "Target does not exist"),
			);

			await expect(
				reactionService.addReaction(
					"owner1",
					"repo1",
					"issue",
					"999",
					"👍",
					"user1",
				),
			).rejects.toThrow(ValidationError);
		});

		it("should throw ValidationError when reaction already exists", async () => {
			mockReactionRepo.create.mockRejectedValue(
				new ValidationError("reaction", "Reaction already exists"),
			);

			await expect(
				reactionService.addReaction(
					"owner1",
					"repo1",
					"issue",
					"1",
					"👍",
					"user1",
				),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("removeReaction", () => {
		it("should remove reaction from an issue", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUE",
				targetId: "1",
				user: "user1",
				emoji: "👍",
			});

			mockReactionRepo.get.mockResolvedValue(mockReaction);
			mockReactionRepo.delete.mockResolvedValue();

			await reactionService.removeReaction(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
				"user1",
			);

			expect(mockReactionRepo.get).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"ISSUE",
				"1",
				"user1",
				"👍",
			);
			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"ISSUE",
				"1",
				"user1",
				"👍",
			);
		});

		it("should remove reaction from a pull request", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PR",
				targetId: "2",
				user: "user1",
				emoji: "🎉",
			});

			mockReactionRepo.get.mockResolvedValue(mockReaction);
			mockReactionRepo.delete.mockResolvedValue();

			await reactionService.removeReaction(
				"owner1",
				"repo1",
				"pullrequest",
				"2",
				"🎉",
				"user1",
			);

			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"PR",
				"2",
				"user1",
				"🎉",
			);
		});

		it("should remove reaction from an issue comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "ISSUECOMMENT",
				targetId: "1-comment1",
				user: "user1",
				emoji: "❤️",
			});

			mockReactionRepo.get.mockResolvedValue(mockReaction);
			mockReactionRepo.delete.mockResolvedValue();

			await reactionService.removeReaction(
				"owner1",
				"repo1",
				"issuecomment",
				"1-comment1",
				"❤️",
				"user1",
			);

			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"ISSUECOMMENT",
				"1-comment1",
				"user1",
				"❤️",
			);
		});

		it("should remove reaction from a PR comment", async () => {
			const mockReaction = new ReactionEntity({
				owner: "owner1",
				repoName: "repo1",
				targetType: "PRCOMMENT",
				targetId: "2-comment1",
				user: "user1",
				emoji: "🚀",
			});

			mockReactionRepo.get.mockResolvedValue(mockReaction);
			mockReactionRepo.delete.mockResolvedValue();

			await reactionService.removeReaction(
				"owner1",
				"repo1",
				"prcomment",
				"2-comment1",
				"🚀",
				"user1",
			);

			expect(mockReactionRepo.delete).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"PRCOMMENT",
				"2-comment1",
				"user1",
				"🚀",
			);
		});
	});

	describe("listReactions", () => {
		it("should list all reactions for an issue", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user2",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(mockReactions);

			const result = await reactionService.listReactions(
				"owner1",
				"repo1",
				"issue",
				"1",
			);

			expect(result).toEqual(mockReactions.map((r) => r.toResponse()));
			expect(mockReactionRepo.listByTarget).toHaveBeenCalledWith(
				"owner1",
				"repo1",
				"ISSUE",
				"1",
			);
		});

		it("should list all reactions for a pull request", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "PR",
					targetId: "2",
					user: "user1",
					emoji: "🚀",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(mockReactions);

			const result = await reactionService.listReactions(
				"owner1",
				"repo1",
				"pullrequest",
				"2",
			);

			expect(result).toEqual(mockReactions.map((r) => r.toResponse()));
		});

		it("should return empty array when no reactions exist", async () => {
			mockReactionRepo.listByTarget.mockResolvedValue([]);

			const result = await reactionService.listReactions(
				"owner1",
				"repo1",
				"issue",
				"1",
			);

			expect(result).toEqual([]);
		});
	});

	describe("getReactionsByEmoji", () => {
		it("should get reactions filtered by emoji for an issue", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				}),
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user2",
					emoji: "👍",
				}),
			];

			const allReactions = [
				...mockReactions,
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user3",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(allReactions);

			const result = await reactionService.getReactionsByEmoji(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
			);

			expect(result).toEqual(mockReactions.map((r) => r.toResponse()));
			expect(result).toHaveLength(2);
		});

		it("should return empty array when no reactions match the emoji", async () => {
			const mockReactions = [
				new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: "ISSUE",
					targetId: "1",
					user: "user1",
					emoji: "❤️",
				}),
			];

			mockReactionRepo.listByTarget.mockResolvedValue(mockReactions);

			const result = await reactionService.getReactionsByEmoji(
				"owner1",
				"repo1",
				"issue",
				"1",
				"👍",
			);

			expect(result).toEqual([]);
		});
	});

	describe("Polymorphic behavior", () => {
		it("should work consistently across all target types", async () => {
			const targetTypes: Array<
				"issue" | "pullrequest" | "issuecomment" | "prcomment"
			> = ["issue", "pullrequest", "issuecomment", "prcomment"];

			for (const targetType of targetTypes) {
				const dbTargetType = (() => {
					switch (targetType) {
						case "issue":
							return "ISSUE";
						case "pullrequest":
							return "PR";
						case "issuecomment":
							return "ISSUECOMMENT";
						case "prcomment":
							return "PRCOMMENT";
					}
				})();

				const mockReaction = new ReactionEntity({
					owner: "owner1",
					repoName: "repo1",
					targetType: dbTargetType as
						| "ISSUE"
						| "PR"
						| "ISSUECOMMENT"
						| "PRCOMMENT",
					targetId: "1",
					user: "user1",
					emoji: "👍",
				});

				mockReactionRepo.create.mockResolvedValue(mockReaction);

				const result = await reactionService.addReaction(
					"owner1",
					"repo1",
					targetType,
					"1",
					"👍",
					"user1",
				);

				expect(result).toEqual(mockReaction.toResponse());
			}
		});
	});
});
