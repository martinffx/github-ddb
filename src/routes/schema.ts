/**
 * Route Schemas
 * TypeBox schemas for request/response validation
 */
import { Type, type Static } from "@sinclair/typebox";

/**
 * Base response fields for all entities
 */
export const BaseResponseSchema = Type.Object({
	created_at: Type.String({ format: "date-time" }),
	updated_at: Type.String({ format: "date-time" }),
});

/**
 * Generic paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends ReturnType<typeof Type.Object>>(itemSchema: T) =>
	Type.Object({
		items: Type.Array(itemSchema),
		offset: Type.Optional(Type.String()),
	});

/**
 * User Schemas
 */
export const UserCreateSchema = Type.Object({
	username: Type.String({ minLength: 1 }),
	email: Type.String({ format: "email" }),
	bio: Type.Optional(Type.String()),
	payment_plan_id: Type.Optional(Type.String()),
});

export const UserUpdateSchema = Type.Object({
	email: Type.Optional(Type.String({ format: "email" })),
	bio: Type.Optional(Type.String()),
	payment_plan_id: Type.Optional(Type.String()),
});

export const UserResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		username: Type.String(),
		email: Type.String(),
		bio: Type.Optional(Type.String()),
		payment_plan_id: Type.Optional(Type.String()),
	}),
]);

export const UserParamsSchema = Type.Object({
	username: Type.String(),
});

export type UserCreateRequest = Static<typeof UserCreateSchema>;
export type UserUpdateRequest = Static<typeof UserUpdateSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;

/**
 * Organization Schemas
 */
export const OrganizationCreateSchema = Type.Object({
	org_name: Type.String({ minLength: 1 }),
	description: Type.Optional(Type.String()),
	payment_plan_id: Type.Optional(Type.String()),
});

export const OrganizationUpdateSchema = Type.Object({
	description: Type.Optional(Type.String()),
	payment_plan_id: Type.Optional(Type.String()),
});

export const OrganizationResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		org_name: Type.String(),
		description: Type.Optional(Type.String()),
		payment_plan_id: Type.Optional(Type.String()),
	}),
]);

export const OrganizationParamsSchema = Type.Object({
	orgName: Type.String(),
});

export type OrganizationCreateRequest = Static<typeof OrganizationCreateSchema>;
export type OrganizationUpdateRequest = Static<typeof OrganizationUpdateSchema>;
export type OrganizationResponse = Static<typeof OrganizationResponseSchema>;

/**
 * Repository Schemas
 */
export const RepositoryCreateSchema = Type.Object({
	owner: Type.String({ minLength: 1 }),
	repo_name: Type.String({ minLength: 1 }),
	description: Type.Optional(Type.String()),
	is_private: Type.Optional(Type.Boolean()),
	language: Type.Optional(Type.String()),
});

export const RepositoryUpdateSchema = Type.Object({
	description: Type.Optional(Type.String()),
	is_private: Type.Optional(Type.Boolean()),
	language: Type.Optional(Type.String()),
});

export const RepositoryResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		owner: Type.String(),
		repo_name: Type.String(),
		description: Type.Optional(Type.String()),
		is_private: Type.Boolean(),
		language: Type.Optional(Type.String()),
	}),
]);

export const RepositoryParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
});

export const RepositoryListParamsSchema = Type.Object({
	owner: Type.String(),
});

export const RepositoryListQuerySchema = Type.Object({
	limit: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
	offset: Type.Optional(Type.String()),
});

export type RepositoryCreateRequest = Static<typeof RepositoryCreateSchema>;
export type RepositoryUpdateRequest = Static<typeof RepositoryUpdateSchema>;
export type RepositoryResponse = Static<typeof RepositoryResponseSchema>;
export type PaginatedResponse<T> = { items: T[]; offset?: string };
