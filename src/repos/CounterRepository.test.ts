import { CounterRepository } from "./CounterRepository";
import {
	createGithubSchema,
	cleanupDDBClient,
} from "../services/entities/fixtures";

describe("CounterRepository", () => {
	let counterRepo: CounterRepository;
	// Use timestamp to ensure unique IDs across test runs
	const testRunId = Date.now();

	beforeAll(async () => {
		const schema = await createGithubSchema();
		counterRepo = new CounterRepository(schema.counter);
	}, 15000);

	afterAll(async () => {
		await cleanupDDBClient();
	});

	describe("incrementAndGet", () => {
		it("should initialize counter to 1 on first increment", async () => {
			const orgId = `test-org-1-${testRunId}`;
			const repoId = `test-repo-1-${testRunId}`;

			const value = await counterRepo.incrementAndGet(orgId, repoId);

			expect(value).toBe(1);
		});

		it("should increment counter sequentially", async () => {
			const orgId = `test-org-2-${testRunId}`;
			const repoId = `test-repo-2-${testRunId}`;

			const value1 = await counterRepo.incrementAndGet(orgId, repoId);
			const value2 = await counterRepo.incrementAndGet(orgId, repoId);
			const value3 = await counterRepo.incrementAndGet(orgId, repoId);

			expect(value1).toBe(1);
			expect(value2).toBe(2);
			expect(value3).toBe(3);
		});

		it("should handle concurrent increments correctly", async () => {
			const orgId = `test-org-3-${testRunId}`;
			const repoId = `test-repo-3-${testRunId}`;

			// Execute 10 increments concurrently
			const promises = Array.from({ length: 10 }, () =>
				counterRepo.incrementAndGet(orgId, repoId),
			);
			const results = await Promise.all(promises);

			// Sort results to verify we got 1 through 10
			const sortedResults = [...results].sort((a, b) => a - b);
			expect(sortedResults).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

			// Verify no duplicates
			const uniqueResults = new Set(results);
			expect(uniqueResults.size).toBe(10);
		});

		it("should maintain separate counters for different repositories", async () => {
			const orgId = `test-org-4-${testRunId}`;
			const repoId1 = `test-repo-4a-${testRunId}`;
			const repoId2 = `test-repo-4b-${testRunId}`;

			const value1a = await counterRepo.incrementAndGet(orgId, repoId1);
			const value1b = await counterRepo.incrementAndGet(orgId, repoId1);
			const value2a = await counterRepo.incrementAndGet(orgId, repoId2);
			const value2b = await counterRepo.incrementAndGet(orgId, repoId2);

			expect(value1a).toBe(1);
			expect(value1b).toBe(2);
			expect(value2a).toBe(1);
			expect(value2b).toBe(2);
		});

		it("should maintain separate counters for different organizations", async () => {
			const orgId1 = `test-org-5a-${testRunId}`;
			const orgId2 = `test-org-5b-${testRunId}`;
			const repoId = `test-repo-5-${testRunId}`;

			const value1a = await counterRepo.incrementAndGet(orgId1, repoId);
			const value1b = await counterRepo.incrementAndGet(orgId1, repoId);
			const value2a = await counterRepo.incrementAndGet(orgId2, repoId);
			const value2b = await counterRepo.incrementAndGet(orgId2, repoId);

			expect(value1a).toBe(1);
			expect(value1b).toBe(2);
			expect(value2a).toBe(1);
			expect(value2b).toBe(2);
		});
	});
});
