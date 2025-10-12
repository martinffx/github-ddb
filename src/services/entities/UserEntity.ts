import type { UserFormatted, UserInput } from "../../repos";
import type { UserCreateRequest, UserResponse } from "../../shared";
import { DateTime } from "luxon";

type UserEntityOpts = {
	username: string;
	email: string;
	bio?: string;
	paymentPlanId?: string;
	created?: DateTime;
	modified?: DateTime;
};

type UpdateUserEntityOpts = Partial<
	Omit<Omit<Omit<UserEntityOpts, "username">, "created">, "updated">
>;

class UserEntity {
	public readonly username: string;
	public readonly email: string;
	public readonly bio?: string;
	public readonly paymentPlanId?: string;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		username,
		email,
		bio,
		paymentPlanId,
		created,
		modified,
	}: UserEntityOpts) {
		this.username = username;
		this.email = email;
		this.bio = bio;
		this.paymentPlanId = paymentPlanId;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	public static fromRequest(rq: UserCreateRequest): UserEntity {
		return new UserEntity({
			username: rq.username,
			email: rq.email,
			bio: rq.bio,
			paymentPlanId: rq.payment_plan_id,
		});
	}

	public static fromRecord(record: UserFormatted): UserEntity {
		return new UserEntity({
			username: record.username,
			email: record.email,
			bio: record.bio,
			paymentPlanId: record.payment_plan_id,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	public toRecord(): UserInput {
		return {
			username: this.username,
			email: this.email,
			bio: this.bio,
			payment_plan_id: this.paymentPlanId,
		};
	}

	public toResponse(): UserResponse {
		return {
			username: this.username,
			email: this.email,
			bio: this.bio,
			payment_plan_id: this.paymentPlanId,
			created_at: this.created.toISO() ?? "",
			updated_at: this.modified.toISO() ?? "",
		};
	}

	public updateUser({
		email,
		bio,
		paymentPlanId,
	}: UpdateUserEntityOpts): UserEntity {
		return new UserEntity({
			username: this.username,
			email: email ?? this.email,
			bio: bio ?? this.bio,
			paymentPlanId: paymentPlanId ?? this.paymentPlanId,
			created: this.created, // Preserve original
			modified: DateTime.utc(), // Update to now
		});
	}
}

export { UserEntity };
