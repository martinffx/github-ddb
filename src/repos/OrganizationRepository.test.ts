import { OrganizationRepository } from "./OrganizationRepository";
import { OrganizationEntity } from "../services/entities/OrganizationEntity";
import {
	ValidationError,
	DuplicateEntityError,
	EntityNotFoundError,
} from "../shared";
import { initializeSchema } from "./schema";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

describe("OrganizationRepository", () => {
	const client = new DynamoDBClient({
		endpoint: "http://localhost:8000",
		region: "local",
		credentials: {
			accessKeyId: "local",
			secretAccessKey: "local",
		},
	});
	const { table, organization } = initializeSchema(client);
	const repository = new OrganizationRepository(table, organization);

	beforeAll(async () => {
		// Create table if it doesn't exist
		try {
			await table.build().createTable().send();
		} catch (error) {
			// Table might already exist, ignore error
		}
	});

	afterEach(async () => {
		// Clean up any test data after each test
		try {
			const scanResult = await organization.build().scan().send();
			if (scanResult.Items) {
				for (const item of scanResult.Items) {
					await organization.build().delete({ org_name: item.org_name }).send();
				}
			}
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	it("should create and delete an organization successfully", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "test-org",
			description: "Test organization",
			payment_plan_id: "plan-123",
		});

		const result = await repository.create(orgEntity);
		expect(result).toBeInstanceOf(OrganizationEntity);
		expect(result.org_name).toBe("test-org");
		expect(result.description).toBe("Test organization");
		expect(result.payment_plan_id).toBe("plan-123");
		expect(result.created_at).toBeDefined();
		expect(result.updated_at).toBeDefined();

		await repository.delete(orgEntity.org_name);
		
		// Verify it's deleted
		const deleted = await repository.get(orgEntity.org_name);
		expect(deleted).toBeNull();
	});

	it("should fail when creating duplicate organization", async () => {
		const orgEntity1 = new OrganizationEntity({
			org_name: "duplicate-org",
			description: "First organization",
			payment_plan_id: "plan-1",
		});

		const orgEntity2 = new OrganizationEntity({
			org_name: "duplicate-org",
			description: "Second organization",
			payment_plan_id: "plan-2",
		});

		// Create first organization
		await repository.create(orgEntity1);

		// Attempt to create duplicate should fail
		await expect(repository.create(orgEntity2)).rejects.toThrow(DuplicateEntityError);
		await expect(repository.create(orgEntity2)).rejects.toThrow("already exists");

		// Clean up
		await repository.delete(orgEntity1.org_name);
	});

	it("should create, get, and delete an organization", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "crud-test-org",
			description: "CRUD test organization",
			payment_plan_id: "plan-456",
		});

		// Create
		const created = await repository.create(orgEntity);
		expect(created.org_name).toBe("crud-test-org");
		expect(created.description).toBe("CRUD test organization");
		expect(created.payment_plan_id).toBe("plan-456");

		// Get
		const retrieved = await repository.get("crud-test-org");
		expect(retrieved).not.toBeNull();
		expect(retrieved!.org_name).toBe(created.org_name);
		expect(retrieved!.description).toBe(created.description);
		expect(retrieved!.payment_plan_id).toBe(created.payment_plan_id);
		expect(retrieved!.created_at).toBe(created.created_at);
		expect(retrieved!.updated_at).toBe(created.updated_at);

		// Delete
		await repository.delete("crud-test-org");

		// Verify deletion
		const deleted = await repository.get("crud-test-org");
		expect(deleted).toBeNull();
	});

	it("should create, update multiple times, get, and delete", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "update-test-org",
			description: "Initial description",
			payment_plan_id: "basic",
		});

		// Create
		const created = await repository.create(orgEntity);
		const createdAt = created.created_at;
		const firstUpdatedAt = created.updated_at;

		// Wait a bit to ensure timestamp difference
		await new Promise(resolve => setTimeout(resolve, 10));

		// First update - change description
		const update1 = new OrganizationEntity({
			org_name: "update-test-org",
			description: "Updated description 1",
			payment_plan_id: "basic",
		});
		const updated1 = await repository.update(update1);
		expect(updated1.description).toBe("Updated description 1");
		expect(updated1.payment_plan_id).toBe("basic");
		expect(updated1.created_at).toBe(createdAt); // Should preserve original created_at
		expect(updated1.updated_at).not.toBe(firstUpdatedAt); // Should have new updated_at

		// Wait a bit to ensure timestamp difference
		await new Promise(resolve => setTimeout(resolve, 10));

		// Second update - change payment plan
		const update2 = new OrganizationEntity({
			org_name: "update-test-org",
			description: "Updated description 1",
			payment_plan_id: "premium",
		});
		const updated2 = await repository.update(update2);
		expect(updated2.description).toBe("Updated description 1");
		expect(updated2.payment_plan_id).toBe("premium");
		expect(updated2.created_at).toBe(createdAt); // Should still preserve original created_at
		expect(updated2.updated_at).not.toBe(updated1.updated_at); // Should have newer updated_at

		// Get and verify final state
		const final = await repository.get("update-test-org");
		expect(final).not.toBeNull();
		expect(final!.org_name).toBe("update-test-org");
		expect(final!.description).toBe("Updated description 1");
		expect(final!.payment_plan_id).toBe("premium");
		expect(final!.created_at).toBe(createdAt);
		expect(final!.updated_at).toBe(updated2.updated_at);

		// Delete
		await repository.delete("update-test-org");

		// Verify deletion
		const deleted = await repository.get("update-test-org");
		expect(deleted).toBeNull();
	});

	it("should return null when getting non-existent organization", async () => {
		const result = await repository.get("non-existent-org");
		expect(result).toBeNull();
	});

	it("should throw EntityNotFoundError when updating non-existent organization", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "non-existent-org",
			description: "Should not exist",
			payment_plan_id: "plan-999",
		});

		await expect(repository.update(orgEntity)).rejects.toThrow(EntityNotFoundError);
		await expect(repository.update(orgEntity)).rejects.toThrow("not found");
	});

	it("should throw EntityNotFoundError when deleting non-existent organization", async () => {
		await expect(repository.delete("non-existent-org")).rejects.toThrow(EntityNotFoundError);
		await expect(repository.delete("non-existent-org")).rejects.toThrow("not found");
	});

	it("should list organizations with pagination", async () => {
		// Create multiple organizations
		const orgs = [
			new OrganizationEntity({ org_name: "list-org-1", description: "Org 1" }),
			new OrganizationEntity({ org_name: "list-org-2", description: "Org 2" }),
			new OrganizationEntity({ org_name: "list-org-3", description: "Org 3" }),
		];

		for (const org of orgs) {
			await repository.create(org);
		}

		// List with default limit
		const page1 = await repository.list();
		expect(page1.items.length).toBeGreaterThanOrEqual(3);
		expect(page1.items.every(item => item instanceof OrganizationEntity)).toBe(true);

		// List with specific limit
		const page2 = await repository.list(2);
		expect(page2.items.length).toBeLessThanOrEqual(2);

		// Clean up
		for (const org of orgs) {
			await repository.delete(org.org_name);
		}
	});

	it("should upsert organization (create path)", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "upsert-new-org",
			description: "Upsert create test",
			payment_plan_id: "plan-upsert",
		});

		// Upsert should create since it doesn't exist
		const result = await repository.upsert(orgEntity);
		expect(result.org_name).toBe("upsert-new-org");
		expect(result.description).toBe("Upsert create test");

		// Verify it was created
		const created = await repository.get("upsert-new-org");
		expect(created).not.toBeNull();

		// Clean up
		await repository.delete("upsert-new-org");
	});

	it("should upsert organization (update path)", async () => {
		const orgEntity = new OrganizationEntity({
			org_name: "upsert-existing-org",
			description: "Initial description",
			payment_plan_id: "plan-initial",
		});

		// Create first
		const created = await repository.create(orgEntity);
		const createdAt = created.created_at;

		// Wait a bit to ensure timestamp difference
		await new Promise(resolve => setTimeout(resolve, 10));

		// Upsert with updated data
		const updatedEntity = new OrganizationEntity({
			org_name: "upsert-existing-org",
			description: "Updated via upsert",
			payment_plan_id: "plan-updated",
		});

		const result = await repository.upsert(updatedEntity);
		expect(result.description).toBe("Updated via upsert");
		expect(result.payment_plan_id).toBe("plan-updated");
		expect(result.created_at).toBe(createdAt); // Should preserve original created_at
		expect(result.updated_at).not.toBe(created.updated_at); // Should have new updated_at

		// Clean up
		await repository.delete("upsert-existing-org");
	});

	it("should throw ValidationError for invalid organization name", async () => {
		const invalidOrg = new OrganizationEntity({
			org_name: "invalid@org!name",
			description: "Should fail validation",
		});

		await expect(repository.create(invalidOrg)).rejects.toThrow(ValidationError);
	});
});