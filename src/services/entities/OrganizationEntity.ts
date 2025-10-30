import { DateTime } from "luxon";
import type { OrganizationFormatted, OrganizationInput } from "../../repos";
import type {
	OrganizationCreateRequest,
	OrganizationResponse,
} from "../../routes/schema";

type OrganizationEntityOpts = {
	orgName: string;
	description?: string;
	paymentPlanId?: string;
	created?: DateTime;
	modified?: DateTime;
};

type UpdateOrganizationEntityOpts = Partial<
	Omit<OrganizationEntityOpts, "orgName" | "created" | "modified">
>;

class OrganizationEntity {
	public readonly orgName: string;
	public readonly description?: string;
	public readonly paymentPlanId?: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		orgName,
		description,
		paymentPlanId,
		created,
		modified,
	}: OrganizationEntityOpts) {
		this.orgName = orgName;
		this.description = description;
		this.paymentPlanId = paymentPlanId;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	public static fromRequest(
		request: OrganizationCreateRequest,
	): OrganizationEntity {
		return new OrganizationEntity({
			orgName: request.org_name,
			description: request.description,
			paymentPlanId: request.payment_plan_id,
		});
	}

	public static fromRecord(record: OrganizationFormatted): OrganizationEntity {
		return new OrganizationEntity({
			orgName: record.org_name,
			description: record.description,
			paymentPlanId: record.payment_plan_id,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	public toRecord(): OrganizationInput {
		return {
			org_name: this.orgName,
			description: this.description,
			payment_plan_id: this.paymentPlanId,
		};
	}

	public toResponse(): OrganizationResponse {
		return {
			org_name: this.orgName,
			description: this.description,
			payment_plan_id: this.paymentPlanId,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	public updateOrganization({
		description,
		paymentPlanId,
	}: UpdateOrganizationEntityOpts): OrganizationEntity {
		return new OrganizationEntity({
			orgName: this.orgName,
			description: description ?? this.description,
			paymentPlanId: paymentPlanId ?? this.paymentPlanId,
			created: this.created, // Preserve original
			modified: DateTime.utc(), // Update to now
		});
	}
}

export { OrganizationEntity };
