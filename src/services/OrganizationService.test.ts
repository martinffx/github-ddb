import { OrganizationService } from "./OrganizationService";
import type { OrganizationRepository } from "../repos";
import { OrganizationEntity } from "./entities";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";
import type {
	OrganizationCreateRequest,
	OrganizationUpdateRequest,
} from "../routes/schema";

describe("OrganizationService", () => {
	const mockOrgRepo = jest.mocked<OrganizationRepository>({
		createOrg: jest.fn(),
		getOrg: jest.fn(),
		updateOrg: jest.fn(),
		deleteOrg: jest.fn(),
	} as unknown as OrganizationRepository);
	const orgService = new OrganizationService(mockOrgRepo);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("createOrganization", () => {
		it("should create a new organization successfully", async () => {
			// Arrange
			const request: OrganizationCreateRequest = {
				org_name: "testorg",
				description: "Test organization",
				payment_plan_id: "free",
			};

			const mockEntity = OrganizationEntity.fromRequest(request);
			mockOrgRepo.createOrg.mockResolvedValue(mockEntity);

			// Act
			const result = await orgService.createOrganization(request);

			// Assert
			expect(mockOrgRepo.createOrg).toHaveBeenCalledTimes(1);
			expect(mockOrgRepo.createOrg).toHaveBeenCalledWith(
				expect.objectContaining({
					orgName: request.org_name,
					description: request.description,
					paymentPlanId: request.payment_plan_id,
				}),
			);
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.org_name).toBe(request.org_name);
			expect(result.description).toBe(request.description);
		});

		it("should throw DuplicateEntityError when organization already exists", async () => {
			// Arrange
			const request: OrganizationCreateRequest = {
				org_name: "existingorg",
				description: "Existing organization",
			};

			mockOrgRepo.createOrg.mockRejectedValue(
				new DuplicateEntityError("OrganizationEntity", request.org_name),
			);

			// Act & Assert
			await expect(orgService.createOrganization(request)).rejects.toThrow(
				DuplicateEntityError,
			);
			await expect(orgService.createOrganization(request)).rejects.toThrow(
				"already exists",
			);
		});

		it("should throw ValidationError for invalid organization data", async () => {
			// Arrange
			const request: OrganizationCreateRequest = {
				org_name: "invalid@org",
				description: "Invalid organization",
			};

			mockOrgRepo.createOrg.mockRejectedValue(
				new ValidationError("org_name", "Invalid organization name format"),
			);

			// Act & Assert
			await expect(orgService.createOrganization(request)).rejects.toThrow(
				ValidationError,
			);
		});
	});

	describe("getOrganization", () => {
		it("should retrieve an existing organization", async () => {
			// Arrange
			const mockEntity = new OrganizationEntity({
				orgName: "testorg",
				description: "Test organization",
			});

			mockOrgRepo.getOrg.mockResolvedValue(mockEntity);

			// Act
			const result = await orgService.getOrganization("testorg");

			// Assert
			expect(mockOrgRepo.getOrg).toHaveBeenCalledWith("testorg");
			expect(result).toEqual(mockEntity.toResponse());
			expect(result.org_name).toBe("testorg");
		});

		it("should throw EntityNotFoundError for non-existent organization", async () => {
			// Arrange
			mockOrgRepo.getOrg.mockResolvedValue(undefined);

			// Act & Assert
			await expect(orgService.getOrganization("nonexistent")).rejects.toThrow(
				EntityNotFoundError,
			);
			await expect(orgService.getOrganization("nonexistent")).rejects.toThrow(
				"not found",
			);
		});
	});

	describe("updateOrganization", () => {
		it("should update an existing organization successfully", async () => {
			// Arrange
			const orgName = "testorg";
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description",
				payment_plan_id: "pro",
			};

			const existingEntity = new OrganizationEntity({
				orgName,
				description: "Old description",
			});

			const updatedEntity = existingEntity.updateOrganization({
				description: updateRequest.description,
				paymentPlanId: updateRequest.payment_plan_id,
			});

			mockOrgRepo.getOrg.mockResolvedValue(existingEntity);
			mockOrgRepo.updateOrg.mockResolvedValue(updatedEntity);

			// Act
			const result = await orgService.updateOrganization(
				orgName,
				updateRequest,
			);

			// Assert
			expect(mockOrgRepo.getOrg).toHaveBeenCalledWith(orgName);
			expect(mockOrgRepo.updateOrg).toHaveBeenCalledTimes(1);
			expect(mockOrgRepo.updateOrg).toHaveBeenCalledWith(
				expect.objectContaining({
					orgName,
					description: updateRequest.description,
					paymentPlanId: updateRequest.payment_plan_id,
				}),
			);
			expect(result.description).toBe(updateRequest.description);
			expect(result.payment_plan_id).toBe(updateRequest.payment_plan_id);
		});

		it("should throw EntityNotFoundError when organization does not exist", async () => {
			// Arrange
			const orgName = "nonexistent";
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description",
			};

			mockOrgRepo.getOrg.mockResolvedValue(undefined);

			// Act & Assert
			await expect(
				orgService.updateOrganization(orgName, updateRequest),
			).rejects.toThrow(EntityNotFoundError);
		});

		it("should allow partial updates", async () => {
			// Arrange
			const orgName = "testorg";
			const updateRequest: OrganizationUpdateRequest = {
				description: "Updated description only",
			};

			const existingEntity = new OrganizationEntity({
				orgName,
				description: "Old description",
				paymentPlanId: "free",
			});

			const updatedEntity = existingEntity.updateOrganization({
				description: updateRequest.description,
			});

			mockOrgRepo.getOrg.mockResolvedValue(existingEntity);
			mockOrgRepo.updateOrg.mockResolvedValue(updatedEntity);

			// Act
			const result = await orgService.updateOrganization(
				orgName,
				updateRequest,
			);

			// Assert
			expect(result.description).toBe(updateRequest.description);
			expect(result.payment_plan_id).toBe(existingEntity.paymentPlanId);
		});
	});

	describe("deleteOrganization", () => {
		it("should delete an existing organization successfully", async () => {
			// Arrange
			const orgName = "testorg";
			const existingEntity = new OrganizationEntity({
				orgName,
				description: "Test organization",
			});

			mockOrgRepo.getOrg.mockResolvedValue(existingEntity);
			mockOrgRepo.deleteOrg.mockResolvedValue(undefined);

			// Act
			await orgService.deleteOrganization(orgName);

			// Assert
			expect(mockOrgRepo.getOrg).toHaveBeenCalledWith(orgName);
			expect(mockOrgRepo.deleteOrg).toHaveBeenCalledWith(orgName);
		});

		it("should throw EntityNotFoundError when organization does not exist", async () => {
			// Arrange
			const orgName = "nonexistent";
			mockOrgRepo.getOrg.mockResolvedValue(undefined);

			// Act & Assert
			await expect(orgService.deleteOrganization(orgName)).rejects.toThrow(
				EntityNotFoundError,
			);
			expect(mockOrgRepo.deleteOrg).not.toHaveBeenCalled();
		});
	});
});
