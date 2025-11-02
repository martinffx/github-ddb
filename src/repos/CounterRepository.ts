import { UpdateItemCommand, $add } from "dynamodb-toolbox";
import type { CounterRecord } from "./schema";

export class CounterRepository {
	private readonly entity: CounterRecord;

	constructor(entity: CounterRecord) {
		this.entity = entity;
	}

	/**
	 * Atomically increment the counter and return the new value.
	 * Creates the counter with value 1 if it doesn't exist.
	 */
	async incrementAndGet(orgId: string, repoId: string): Promise<number> {
		const result = await this.entity
			.build(UpdateItemCommand)
			.item({
				org_id: orgId,
				repo_id: repoId,
				current_value: $add(1),
			})
			.options({ returnValues: "ALL_NEW" })
			.send();

		if (!result.Attributes?.current_value) {
			throw new Error(
				"Failed to increment counter: invalid response from DynamoDB",
			);
		}

		return result.Attributes.current_value;
	}
}
