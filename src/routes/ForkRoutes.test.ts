import { describe, expect, it, beforeAll, afterAll, jest } from "@jest/globals";
import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type { ForkService } from "../services/ForkService";
import type { Services } from "../services";
import { ValidationError, DuplicateEntityError } from "../shared";

describe("ForkRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockForkService = jest.mocked<ForkService>({
		createFork: jest.fn(),
		deleteFork: jest.fn(),
		listForks: jest.fn(),
		getFork: jest.fn(),
	} as unknown as ForkService);
	const mockServices = {
		forkService: mockForkService,
	} as unknown as Services;

	beforeAll(async () => {
		app = await createApp({ config, services: mockServices });
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("POST /v1/repositories/:owner/:repoName/forks", () => {
		it("should create a fork and return 201", async () => {
			const forkResponse = {
				original_owner: "owner",
				original_repo: "repo",
				fork_owner: "forker",
				fork_repo: "forked-repo",
				created_at: "2025-01-01T00:00:00.000Z",
				updated_at: "2025-01-01T00:00:00.000Z",
			};

			mockForkService.createFork.mockResolvedValue(forkResponse);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner/repo/forks",
				payload: {
					fork_owner: "forker",
					fork_repo: "forked-repo",
				},
			});

			expect(response.statusCode).toBe(201);
			expect(response.json()).toEqual(forkResponse);
			expect(mockForkService.createFork).toHaveBeenCalledWith(
				"owner",
				"repo",
				"forker",
				"forked-repo",
			);
		});

		it("should return 400 when validation fails", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner/repo/forks",
				payload: {
					fork_owner: "forker",
					// Missing fork_repo
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it("should return 409 when fork already exists", async () => {
			mockForkService.createFork.mockRejectedValue(
				new DuplicateEntityError("Fork", "FORK#owner#repo#forker"),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner/repo/forks",
				payload: {
					fork_owner: "forker",
					fork_repo: "forked-repo",
				},
			});

			expect(response.statusCode).toBe(409);
		});

		it("should return 400 when repository does not exist", async () => {
			mockForkService.createFork.mockRejectedValue(
				new ValidationError(
					"repository",
					"Source or target repository does not exist",
				),
			);

			const response = await app.inject({
				method: "POST",
				url: "/v1/repositories/owner/repo/forks",
				payload: {
					fork_owner: "forker",
					fork_repo: "forked-repo",
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/forks", () => {
		it("should list all forks and return 200", async () => {
			const forks = [
				{
					original_owner: "owner",
					original_repo: "repo",
					fork_owner: "forker1",
					fork_repo: "forked-repo-1",
					created_at: "2025-01-01T00:00:00.000Z",
					updated_at: "2025-01-01T00:00:00.000Z",
				},
				{
					original_owner: "owner",
					original_repo: "repo",
					fork_owner: "forker2",
					fork_repo: "forked-repo-2",
					created_at: "2025-01-01T00:00:00.000Z",
					updated_at: "2025-01-01T00:00:00.000Z",
				},
			];

			mockForkService.listForks.mockResolvedValue(forks);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/repo/forks",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual(forks);
			expect(mockForkService.listForks).toHaveBeenCalledWith("owner", "repo");
		});

		it("should return empty array when no forks exist", async () => {
			mockForkService.listForks.mockResolvedValue([]);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/repo/forks",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual([]);
		});
	});

	describe("DELETE /v1/repositories/:owner/:repoName/forks/:forkedOwner/:forkedRepo", () => {
		it("should delete a fork and return 204", async () => {
			mockForkService.deleteFork.mockResolvedValue(undefined);

			const response = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/owner/repo/forks/forker/forked-repo",
			});

			expect(response.statusCode).toBe(204);
			expect(mockForkService.deleteFork).toHaveBeenCalledWith(
				"owner",
				"repo",
				"forker",
				"forked-repo",
			);
		});

		it("should return 204 even if fork does not exist", async () => {
			mockForkService.deleteFork.mockResolvedValue(undefined);

			const response = await app.inject({
				method: "DELETE",
				url: "/v1/repositories/owner/repo/forks/forker/forked-repo",
			});

			expect(response.statusCode).toBe(204);
		});
	});
});
