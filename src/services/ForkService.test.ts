import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import type { ForkRepository } from "../repos";
import { ForkService } from "./ForkService";
import { ForkEntity } from "./entities";
import { DuplicateEntityError, ValidationError } from "../shared";

describe("ForkService", () => {
	let forkService: ForkService;
	let mockForkRepo: jest.Mocked<ForkRepository>;

	beforeEach(() => {
		mockForkRepo = {
			create: jest.fn<ForkRepository["create"]>(),
			get: jest.fn<ForkRepository["get"]>(),
			delete: jest.fn<ForkRepository["delete"]>(),
			listForksOfRepo: jest.fn<ForkRepository["listForksOfRepo"]>(),
		} as jest.Mocked<ForkRepository>;

		forkService = new ForkService(mockForkRepo);
	});

	describe("createFork", () => {
		it("should create a fork and return response", async () => {
			const mockForkEntity = new ForkEntity({
				originalOwner: "owner",
				originalRepo: "repo",
				forkOwner: "forker",
				forkRepo: "forked-repo",
			});

			mockForkRepo.create.mockResolvedValue(mockForkEntity);

			const result = await forkService.createFork(
				"owner",
				"repo",
				"forker",
				"forked-repo",
			);

			expect(mockForkRepo.create).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockForkEntity.toResponse());
		});

		it("should handle duplicate fork error", async () => {
			mockForkRepo.create.mockRejectedValue(
				new DuplicateEntityError("Fork", "FORK#owner#repo#forker"),
			);

			await expect(
				forkService.createFork("owner", "repo", "forker", "forked-repo"),
			).rejects.toThrow(DuplicateEntityError);
		});

		it("should handle missing repository error", async () => {
			mockForkRepo.create.mockRejectedValue(
				new ValidationError("repository", "Repository does not exist"),
			);

			await expect(
				forkService.createFork("owner", "repo", "forker", "forked-repo"),
			).rejects.toThrow(ValidationError);
		});

		it("should handle validation error for invalid fork data", async () => {
			await expect(
				forkService.createFork("owner", "repo", "forker", "forker repo"),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("deleteFork", () => {
		it("should delete a fork", async () => {
			const mockFork = new ForkEntity({
				originalOwner: "owner",
				originalRepo: "repo",
				forkOwner: "forker",
				forkRepo: "forked-repo",
			});

			mockForkRepo.get.mockResolvedValue(mockFork);
			mockForkRepo.delete.mockResolvedValue(undefined);

			await forkService.deleteFork("owner", "repo", "forker", "forked-repo");

			expect(mockForkRepo.get).toHaveBeenCalledWith("owner", "repo", "forker");
			expect(mockForkRepo.delete).toHaveBeenCalledWith(
				"owner",
				"repo",
				"forker",
			);
		});

		it("should throw EntityNotFoundError if fork does not exist", async () => {
			mockForkRepo.get.mockResolvedValue(undefined);

			await expect(
				forkService.deleteFork("owner", "repo", "forker", "forked-repo"),
			).rejects.toThrow("ForkEntity 'FORK#owner#repo#forker' not found");
		});
	});

	describe("listForks", () => {
		it("should return all forks of a repository", async () => {
			const mockFork1 = new ForkEntity({
				originalOwner: "owner",
				originalRepo: "repo",
				forkOwner: "forker1",
				forkRepo: "forked-repo-1",
			});
			const mockFork2 = new ForkEntity({
				originalOwner: "owner",
				originalRepo: "repo",
				forkOwner: "forker2",
				forkRepo: "forked-repo-2",
			});

			mockForkRepo.listForksOfRepo.mockResolvedValue([mockFork1, mockFork2]);

			const result = await forkService.listForks("owner", "repo");

			expect(mockForkRepo.listForksOfRepo).toHaveBeenCalledWith(
				"owner",
				"repo",
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mockFork1.toResponse());
			expect(result[1]).toEqual(mockFork2.toResponse());
		});

		it("should return empty array when no forks exist", async () => {
			mockForkRepo.listForksOfRepo.mockResolvedValue([]);

			const result = await forkService.listForks("owner", "repo");

			expect(result).toEqual([]);
		});
	});

	describe("getFork", () => {
		it("should return fork when it exists", async () => {
			const mockForkEntity = new ForkEntity({
				originalOwner: "owner",
				originalRepo: "repo",
				forkOwner: "forker",
				forkRepo: "forked-repo",
			});

			mockForkRepo.get.mockResolvedValue(mockForkEntity);

			const result = await forkService.getFork(
				"owner",
				"repo",
				"forker",
				"forked-repo",
			);

			expect(mockForkRepo.get).toHaveBeenCalledWith("owner", "repo", "forker");
			expect(result).toEqual(mockForkEntity.toResponse());
		});

		it("should return undefined when fork does not exist", async () => {
			mockForkRepo.get.mockResolvedValue(undefined);

			const result = await forkService.getFork(
				"owner",
				"repo",
				"forker",
				"forked-repo",
			);

			expect(result).toBeUndefined();
		});
	});
});
