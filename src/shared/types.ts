/**
 * Base response fields for all entities
 */
export interface BaseResponse {
	created_at: string;
	updated_at: string;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
	items: T[];
	next_cursor?: string;
	has_more: boolean;
}

/**
 * User domain types
 */
export interface UserCreateRequest {
	username: string;
	email: string;
	bio?: string;
	payment_plan_id?: string;
}

export interface UserUpdateRequest {
	email?: string;
	bio?: string;
	payment_plan_id?: string;
}

export interface UserResponse extends BaseResponse {
	username: string;
	email: string;
	bio?: string;
	payment_plan_id?: string;
}

/**
 * Organization domain types
 */
export interface OrganizationCreateRequest {
	org_name: string;
	description?: string;
	payment_plan_id?: string;
}

export interface OrganizationUpdateRequest {
	description?: string;
	payment_plan_id?: string;
}

export interface OrganizationResponse extends BaseResponse {
	org_name: string;
	description?: string;
	payment_plan_id?: string;
}

/**
 * Repository domain types
 */
export interface RepositoryCreateRequest {
	owner: string;
	repo_name: string;
	description?: string;
	is_private?: boolean;
	language?: string;
}

export interface RepositoryUpdateRequest {
	description?: string;
	is_private?: boolean;
	language?: string;
}

export interface RepositoryResponse extends BaseResponse {
	owner: string;
	repo_name: string;
	description?: string;
	is_private: boolean;
	language?: string;
}
