import { DateTime } from "luxon";
import type { CounterFormatted, CounterInput } from "../../repos";

type CounterEntityOpts = {
	orgId: string;
	repoId: string;
	currentValue: number;
	created?: DateTime;
	modified?: DateTime;
};

class CounterEntity {
	public readonly orgId: string;
	public readonly repoId: string;
	public readonly currentValue: number;
	public readonly created: DateTime;
	public readonly modified: DateTime;

	constructor({
		orgId,
		repoId,
		currentValue,
		created,
		modified,
	}: CounterEntityOpts) {
		this.orgId = orgId;
		this.repoId = repoId;
		this.currentValue = currentValue;
		this.created = created ?? DateTime.utc();
		this.modified = modified ?? DateTime.utc();
	}

	public static fromRecord(record: CounterFormatted): CounterEntity {
		return new CounterEntity({
			orgId: record.org_id,
			repoId: record.repo_id,
			currentValue: record.current_value,
			created: DateTime.fromISO(record.created),
			modified: DateTime.fromISO(record.modified),
		});
	}

	public toRecord(): CounterInput {
		return {
			org_id: this.orgId,
			repo_id: this.repoId,
			current_value: this.currentValue,
			created: this.created.toISO() ?? undefined,
			modified: this.modified.toISO() ?? undefined,
		};
	}
}

export { CounterEntity };
