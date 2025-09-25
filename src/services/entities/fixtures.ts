import { UserEntity } from "./UserEntity";
import { OrganizationEntity } from "./OrganizationEntity";
import { RepositoryEntity } from "./RepositoryEntity";

// Simple counter for generating unique test data
let userCounter = 0;
let orgCounter = 0;
let repoCounter = 0;

/**
 * Create a test UserEntity with sensible defaults
 */
export function createUserEntity(overrides: Partial<{
	username: string;
	email: string;
	bio?: string;
	payment_plan_id?: string;
	created_at?: string;
	updated_at?: string;
}> = {}): UserEntity {
	const count = ++userCounter;
	return new UserEntity({
		username: `testuser${count}`,
		email: `test${count}@example.com`,
		bio: undefined,
		payment_plan_id: undefined,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides,
	});
}

/**
 * Create a test OrganizationEntity with sensible defaults
 */
export function createOrganizationEntity(overrides: Partial<{
	org_name: string;
	description?: string;
	payment_plan_id?: string;
	created_at?: string;
	updated_at?: string;
}> = {}): OrganizationEntity {
	const count = ++orgCounter;
	return new OrganizationEntity({
		org_name: `testorg${count}`,
		description: undefined,
		payment_plan_id: undefined,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides,
	});
}

/**
 * Create a test RepositoryEntity with sensible defaults
 */
export function createRepositoryEntity(overrides: Partial<{
	owner: string;
	repo_name: string;
	description?: string;
	is_private: boolean;
	language?: string;
	created_at?: string;
	updated_at?: string;
}> = {}): RepositoryEntity {
	const count = ++repoCounter;
	return new RepositoryEntity({
		owner: `testuser${count}`,
		repo_name: `testrepo${count}`,
		description: undefined,
		is_private: false,
		language: undefined,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides,
	});
}

/**
 * Reset all counters - useful for test isolation
 */
export function resetFixtureCounters(): void {
	userCounter = 0;
	orgCounter = 0;
	repoCounter = 0;
}