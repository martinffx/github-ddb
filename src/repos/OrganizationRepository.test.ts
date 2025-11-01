import { OrganizationRepository } from "./OrganizationRepository";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import {
	createOrganizationEntity,
	createGithubSchema,
	cleanupDDBClient,
} from "../services/entities/fixtures";
import { DuplicateEntityError, EntityNotFoundError } from "../shared";

describe("OrganizationRepository", () => {
	let orgRepo: OrganizationRepository;

	beforeAll(async () => {
		const { organization } = await createGithubSchema();
		orgRepo = new OrganizationRepository(organization);
	}, 15000);

	afterAll(async () => {
		await cleanupDDBClient();
	});

	it("should create a new organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "test-org",
			description: "Test organization",
		});

		const result = await orgRepo.createOrg(orgEntity);
		expect(result).toBeInstanceOf(OrganizationEntity);
		expect(result.orgName).toBe("test-org");
		expect(result.description).toBe("Test organization");

		await orgRepo.deleteOrg(result.orgName);
	});

	it("should throw DuplicateEntityError for duplicate organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "duplicate-org",
			description: "First organization",
		});

		await orgRepo.createOrg(orgEntity);
		await expect(orgRepo.createOrg(orgEntity)).rejects.toThrow(
			DuplicateEntityError,
		);

		await orgRepo.deleteOrg(orgEntity.orgName);
	});

	it("should get an existing organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "get-test-org",
			description: "Get test organization",
		});

		await orgRepo.createOrg(orgEntity);

		const result = await orgRepo.getOrg("get-test-org");
		if (result === undefined) {
			throw new Error("undefined");
		}

		expect(result).toBeInstanceOf(OrganizationEntity);
		expect(result.orgName).toBe("get-test-org");
		expect(result.description).toBe("Get test organization");

		await orgRepo.deleteOrg(result.orgName);
	});

	it("should return undefined for non-existent organization", async () => {
		const result = await orgRepo.getOrg("non-existent-org");
		expect(result).toBeUndefined();
	});

	it("should update an existing organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "update-test-org",
			description: "Initial description",
		});

		const created = await orgRepo.createOrg(orgEntity);

		const updatedEntity = new OrganizationEntity({
			orgName: "update-test-org",
			description: "Updated description",
			paymentPlanId: "premium",
		});

		const result = await orgRepo.updateOrg(updatedEntity);
		expect(result.description).toBe("Updated description");
		expect(result.paymentPlanId).toBe("premium");
		expect(result.modified).not.toBe(created.modified);

		await orgRepo.deleteOrg(created.orgName);
	});

	it("should throw EntityNotFoundError when updating non-existent organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "non-existent-update",
			description: "Should not exist",
		});

		await expect(orgRepo.updateOrg(orgEntity)).rejects.toThrow(
			EntityNotFoundError,
		);
	});

	it("should delete an organization", async () => {
		const orgEntity = createOrganizationEntity({
			orgName: "delete-test-org",
			description: "Delete test organization",
		});

		await orgRepo.createOrg(orgEntity);
		await orgRepo.deleteOrg("delete-test-org");

		const result = await orgRepo.getOrg("delete-test-org");
		expect(result).toBeUndefined();
	});
});
