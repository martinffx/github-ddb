import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import type { StarRepository } from "../repos";
import { StarService } from "./StarService";
import { StarEntity } from "./entities";
import { DuplicateEntityError, ValidationError } from "../shared";

describe("StarService", () => {
	let starService: StarService;
	let mockStarRepo: jest.Mocked<StarRepository>;

	beforeEach(() => {
		mockStarRepo = {
			create: jest.fn<StarRepository["create"]>(),
			get: jest.fn<StarRepository["get"]>(),
			delete: jest.fn<StarRepository["delete"]>(),
			listStarsByUser: jest.fn<StarRepository["listStarsByUser"]>(),
			isStarred: jest.fn<StarRepository["isStarred"]>(),
		} as jest.Mocked<StarRepository>;

		starService = new StarService(mockStarRepo);
	});

	describe("starRepository", () => {
		it("should star a repository and return response", async () => {
			const mockStarEntity = new StarEntity({
				username: "user",
				repoOwner: "owner",
				repoName: "repo",
			});

			mockStarRepo.create.mockResolvedValue(mockStarEntity);

			const result = await starService.starRepository("user", "owner", "repo");

			expect(mockStarRepo.create).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockStarEntity.toResponse());
		});

		it("should handle duplicate star error", async () => {
			mockStarRepo.create.mockRejectedValue(
				new DuplicateEntityError("Star", "STAR#user#owner#repo"),
			);

			await expect(
				starService.starRepository("user", "owner", "repo"),
			).rejects.toThrow(DuplicateEntityError);
		});

		it("should handle missing user or repository error", async () => {
			mockStarRepo.create.mockRejectedValue(
				new ValidationError(
					"star",
					"User 'user' or repository 'owner/repo' does not exist",
				),
			);

			await expect(
				starService.starRepository("user", "owner", "repo"),
			).rejects.toThrow(ValidationError);
		});

		it("should handle validation error for invalid star data", async () => {
			await expect(
				starService.starRepository("user name", "owner", "repo"),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("unstarRepository", () => {
		it("should unstar a repository", async () => {
			mockStarRepo.isStarred.mockResolvedValue(true);
			mockStarRepo.delete.mockResolvedValue(undefined);

			await starService.unstarRepository("user", "owner", "repo");

			expect(mockStarRepo.isStarred).toHaveBeenCalledWith(
				"user",
				"owner",
				"repo",
			);
			expect(mockStarRepo.delete).toHaveBeenCalledWith("user", "owner", "repo");
		});

		it("should throw EntityNotFoundError if star does not exist", async () => {
			mockStarRepo.isStarred.mockResolvedValue(false);

			await expect(
				starService.unstarRepository("user", "owner", "repo"),
			).rejects.toThrow("StarEntity 'STAR#user#owner#repo' not found");
		});
	});

	describe("listUserStars", () => {
		it("should return all repositories starred by user", async () => {
			const mockStar1 = new StarEntity({
				username: "user",
				repoOwner: "owner1",
				repoName: "repo1",
			});
			const mockStar2 = new StarEntity({
				username: "user",
				repoOwner: "owner2",
				repoName: "repo2",
			});

			mockStarRepo.listStarsByUser.mockResolvedValue([mockStar1, mockStar2]);

			const result = await starService.listUserStars("user");

			expect(mockStarRepo.listStarsByUser).toHaveBeenCalledWith("user");
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mockStar1.toResponse());
			expect(result[1]).toEqual(mockStar2.toResponse());
		});

		it("should return empty array when user has no stars", async () => {
			mockStarRepo.listStarsByUser.mockResolvedValue([]);

			const result = await starService.listUserStars("user");

			expect(result).toEqual([]);
		});
	});

	describe("isStarred", () => {
		it("should return true when repository is starred", async () => {
			mockStarRepo.isStarred.mockResolvedValue(true);

			const result = await starService.isStarred("user", "owner", "repo");

			expect(mockStarRepo.isStarred).toHaveBeenCalledWith(
				"user",
				"owner",
				"repo",
			);
			expect(result).toBe(true);
		});

		it("should return false when repository is not starred", async () => {
			mockStarRepo.isStarred.mockResolvedValue(false);

			const result = await starService.isStarred("user", "owner", "repo");

			expect(result).toBe(false);
		});
	});
});
