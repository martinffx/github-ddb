import { describe, expect, it, beforeAll, afterAll, jest } from "@jest/globals";
import type Fastify from "fastify";
import { createApp } from "..";
import { Config } from "../config";
import type { StarService } from "../services/StarService";
import type { Services } from "../services";
import { ValidationError, DuplicateEntityError } from "../shared";

describe("StarRoutes", () => {
	let app: Awaited<ReturnType<typeof Fastify>>;
	const config = new Config();
	const mockStarService = jest.mocked<StarService>({
		starRepository: jest.fn(),
		unstarRepository: jest.fn(),
		listUserStars: jest.fn(),
		isStarred: jest.fn(),
	} as unknown as StarService);
	const mockServices = {
		starService: mockStarService,
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

	describe("PUT /v1/user/starred/:owner/:repoName", () => {
		it("should star a repository and return 201", async () => {
			const starResponse = {
				username: "user",
				repo_owner: "owner",
				repo_name: "repo",
				created_at: "2025-01-01T00:00:00.000Z",
				updated_at: "2025-01-01T00:00:00.000Z",
			};

			mockStarService.starRepository.mockResolvedValue(starResponse);

			const response = await app.inject({
				method: "PUT",
				url: "/v1/user/starred/owner/repo",
				payload: {
					username: "user",
				},
			});

			expect(response.statusCode).toBe(204);
			expect(mockStarService.starRepository).toHaveBeenCalledWith(
				"user",
				"owner",
				"repo",
			);
		});

		it("should return 409 when already starred", async () => {
			mockStarService.starRepository.mockRejectedValue(
				new DuplicateEntityError("Star", "STAR#user#owner#repo"),
			);

			const response = await app.inject({
				method: "PUT",
				url: "/v1/user/starred/owner/repo",
				payload: {
					username: "user",
				},
			});

			expect(response.statusCode).toBe(409);
		});

		it("should return 400 when user or repository does not exist", async () => {
			mockStarService.starRepository.mockRejectedValue(
				new ValidationError("star", "User or repository does not exist"),
			);

			const response = await app.inject({
				method: "PUT",
				url: "/v1/user/starred/owner/repo",
				payload: {
					username: "user",
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe("DELETE /v1/user/starred/:owner/:repoName", () => {
		it("should unstar a repository and return 204", async () => {
			mockStarService.unstarRepository.mockResolvedValue(undefined);

			const response = await app.inject({
				method: "DELETE",
				url: "/v1/user/starred/owner/repo",
				payload: {
					username: "user",
				},
			});

			expect(response.statusCode).toBe(204);
			expect(mockStarService.unstarRepository).toHaveBeenCalledWith(
				"user",
				"owner",
				"repo",
			);
		});

		it("should return 204 even if star does not exist", async () => {
			mockStarService.unstarRepository.mockResolvedValue(undefined);

			const response = await app.inject({
				method: "DELETE",
				url: "/v1/user/starred/owner/repo",
				payload: {
					username: "user",
				},
			});

			expect(response.statusCode).toBe(204);
		});
	});

	describe("GET /v1/users/:username/starred", () => {
		it("should list all starred repositories and return 200", async () => {
			const stars = [
				{
					username: "user",
					repo_owner: "owner1",
					repo_name: "repo1",
					created_at: "2025-01-01T00:00:00.000Z",
					updated_at: "2025-01-01T00:00:00.000Z",
				},
				{
					username: "user",
					repo_owner: "owner2",
					repo_name: "repo2",
					created_at: "2025-01-01T00:00:00.000Z",
					updated_at: "2025-01-01T00:00:00.000Z",
				},
			];

			mockStarService.listUserStars.mockResolvedValue(stars);

			const response = await app.inject({
				method: "GET",
				url: "/v1/users/user/starred",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual(stars);
			expect(mockStarService.listUserStars).toHaveBeenCalledWith("user");
		});

		it("should return empty array when user has no stars", async () => {
			mockStarService.listUserStars.mockResolvedValue([]);

			const response = await app.inject({
				method: "GET",
				url: "/v1/users/user/starred",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual([]);
		});
	});

	describe("GET /v1/repositories/:owner/:repoName/stargazers", () => {
		it("should return starred status true", async () => {
			mockStarService.isStarred.mockResolvedValue(true);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/repo/stargazers?username=user",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ starred: true });
			expect(mockStarService.isStarred).toHaveBeenCalledWith(
				"user",
				"owner",
				"repo",
			);
		});

		it("should return starred status false", async () => {
			mockStarService.isStarred.mockResolvedValue(false);

			const response = await app.inject({
				method: "GET",
				url: "/v1/repositories/owner/repo/stargazers?username=user",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ starred: false });
		});
	});
});
