import type { OrganizationRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	OrganizationCreateRequest,
	OrganizationUpdateRequest,
	OrganizationResponse,
} from "../routes/schema";
import { OrganizationEntity } from "./entities";

class OrganizationService {
	private readonly orgRepo: OrganizationRepository;

	constructor(repo: OrganizationRepository) {
		this.orgRepo = repo;
	}

	/**
	 * Creates a new organization with the provided details
	 * @param request - Organization creation data including org_name, description, and optional payment plan
	 * @returns Organization response with timestamps
	 * @throws {DuplicateEntityError} If organization name already exists
	 * @throws {ValidationError} If organization data is invalid
	 */
	public async createOrganization(
		request: OrganizationCreateRequest,
	): Promise<OrganizationResponse> {
		const entity = OrganizationEntity.fromRequest(request);
		const createdEntity = await this.orgRepo.createOrg(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves an organization by its name
	 * @param orgName - The organization name to look up
	 * @returns Organization response with all organization data
	 * @throws {EntityNotFoundError} If organization does not exist
	 */
	public async getOrganization(orgName: string): Promise<OrganizationResponse> {
		const org = await this.orgRepo.getOrg(orgName);

		if (org === undefined) {
			throw new EntityNotFoundError("OrganizationEntity", orgName);
		}

		return org.toResponse();
	}

	/**
	 * Updates an existing organization with new data (partial updates supported)
	 * @param orgName - The organization name to update
	 * @param request - Organization update data (description and/or payment_plan_id)
	 * @returns Updated organization response with new data
	 * @throws {EntityNotFoundError} If organization does not exist
	 * @throws {ValidationError} If update data is invalid
	 */
	public async updateOrganization(
		orgName: string,
		request: OrganizationUpdateRequest,
	): Promise<OrganizationResponse> {
		// First check if organization exists
		const existingOrg = await this.orgRepo.getOrg(orgName);

		if (existingOrg === undefined) {
			throw new EntityNotFoundError("OrganizationEntity", orgName);
		}

		// Update the entity with new data
		const updatedEntity = existingOrg.updateOrganization({
			description: request.description,
			paymentPlanId: request.payment_plan_id,
		});

		// Save and return
		const savedEntity = await this.orgRepo.updateOrg(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes an organization by name
	 * @param orgName - The organization name to delete
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If organization does not exist
	 */
	public async deleteOrganization(orgName: string): Promise<void> {
		// First check if organization exists
		const existingOrg = await this.orgRepo.getOrg(orgName);

		if (existingOrg === undefined) {
			throw new EntityNotFoundError("OrganizationEntity", orgName);
		}

		await this.orgRepo.deleteOrg(orgName);
	}
}

export { OrganizationService };
