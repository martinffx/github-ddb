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
export const PaginatedResponseSchema = <
	T extends ReturnType<typeof Type.Object>,
>(
	itemSchema: T,
) =>
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

/**
 * Issue Schemas
 */
export const IssueCreateSchema = Type.Object({
	title: Type.String({ minLength: 1, maxLength: 255 }),
	body: Type.Optional(Type.String()),
	status: Type.Optional(
		Type.Union([Type.Literal("open"), Type.Literal("closed")]),
	),
	author: Type.String({ minLength: 1 }),
	assignees: Type.Optional(Type.Array(Type.String())),
	labels: Type.Optional(Type.Array(Type.String())),
});

export const IssueUpdateSchema = Type.Partial(
	Type.Object({
		title: Type.String({ minLength: 1, maxLength: 255 }),
		body: Type.String(),
		status: Type.Union([Type.Literal("open"), Type.Literal("closed")]),
		assignees: Type.Array(Type.String()),
		labels: Type.Array(Type.String()),
	}),
);

export const IssueResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		owner: Type.String(),
		repo_name: Type.String(),
		issue_number: Type.Number(),
		title: Type.String(),
		body: Type.Optional(Type.String()),
		status: Type.String(),
		author: Type.String(),
		assignees: Type.Array(Type.String()),
		labels: Type.Array(Type.String()),
	}),
]);

export const IssueParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	issueNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export const IssueListParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
});

export const IssueListQuerySchema = Type.Object({
	status: Type.Optional(
		Type.Union([Type.Literal("open"), Type.Literal("closed")]),
	),
});

export type IssueCreateRequest = Static<typeof IssueCreateSchema>;
export type IssueUpdateRequest = Static<typeof IssueUpdateSchema>;
export type IssueResponse = Static<typeof IssueResponseSchema>;

/**
 * Pull Request Schemas
 */
export const PullRequestCreateSchema = Type.Object({
	title: Type.String({ minLength: 1, maxLength: 255 }),
	body: Type.Optional(Type.String()),
	status: Type.Optional(
		Type.Union([
			Type.Literal("open"),
			Type.Literal("closed"),
			Type.Literal("merged"),
		]),
	),
	author: Type.String({ minLength: 1 }),
	source_branch: Type.String({ minLength: 1 }),
	target_branch: Type.String({ minLength: 1 }),
	merge_commit_sha: Type.Optional(Type.String()),
});

export const PullRequestUpdateSchema = Type.Partial(
	Type.Object({
		title: Type.String({ minLength: 1, maxLength: 255 }),
		body: Type.String(),
		status: Type.Union([
			Type.Literal("open"),
			Type.Literal("closed"),
			Type.Literal("merged"),
		]),
		source_branch: Type.String({ minLength: 1 }),
		target_branch: Type.String({ minLength: 1 }),
		merge_commit_sha: Type.String(),
	}),
);

export const PullRequestResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		owner: Type.String(),
		repo_name: Type.String(),
		pr_number: Type.Number(),
		title: Type.String(),
		body: Type.Optional(Type.String()),
		status: Type.String(),
		author: Type.String(),
		source_branch: Type.String(),
		target_branch: Type.String(),
		merge_commit_sha: Type.Optional(Type.String()),
	}),
]);

export const PullRequestParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	prNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export const PullRequestListParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
});

export const PullRequestListQuerySchema = Type.Object({
	status: Type.Optional(
		Type.Union([
			Type.Literal("open"),
			Type.Literal("closed"),
			Type.Literal("merged"),
		]),
	),
});

export type PullRequestCreateRequest = Static<typeof PullRequestCreateSchema>;
export type PullRequestUpdateRequest = Static<typeof PullRequestUpdateSchema>;
export type PullRequestResponse = Static<typeof PullRequestResponseSchema>;

/**
 * Comment Schemas (for both Issue and PR comments)
 */
export const CommentCreateSchema = Type.Object({
	author: Type.String({ minLength: 1 }),
	body: Type.String({ minLength: 1 }),
});

export const CommentUpdateSchema = Type.Object({
	body: Type.String({ minLength: 1 }),
});

export const CommentResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		owner: Type.String(),
		repo_name: Type.String(),
		comment_id: Type.String(),
		body: Type.String(),
		author: Type.String(),
	}),
]);

export const IssueCommentResponseSchema = Type.Intersect([
	CommentResponseSchema,
	Type.Object({
		issue_number: Type.Number(),
	}),
]);

export const PRCommentResponseSchema = Type.Intersect([
	CommentResponseSchema,
	Type.Object({
		pr_number: Type.Number(),
	}),
]);

export const IssueCommentParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	issueNumber: Type.String({ pattern: "^[0-9]+$" }),
	commentId: Type.String(),
});

export const PRCommentParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	prNumber: Type.String({ pattern: "^[0-9]+$" }),
	commentId: Type.String(),
});

export const IssueCommentListParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	issueNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export const PRCommentListParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	prNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export type CommentCreateRequest = Static<typeof CommentCreateSchema>;
export type CommentUpdateRequest = Static<typeof CommentUpdateSchema>;
export type IssueCommentResponse = Static<typeof IssueCommentResponseSchema>;
export type PRCommentResponse = Static<typeof PRCommentResponseSchema>;

/**
 * Reaction Schemas
 */
export const ReactionCreateSchema = Type.Object({
	emoji: Type.String({ minLength: 1 }),
	user: Type.String({ minLength: 1 }),
});

export const ReactionResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		owner: Type.String(),
		repo_name: Type.String(),
		target_type: Type.String(),
		target_id: Type.String(),
		user: Type.String(),
		emoji: Type.String(),
	}),
]);

export const IssueReactionParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	issueNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export const PRReactionParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	prNumber: Type.String({ pattern: "^[0-9]+$" }),
});

export const IssueCommentReactionParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	issueNumber: Type.String({ pattern: "^[0-9]+$" }),
	commentId: Type.String(),
});

export const PRCommentReactionParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	prNumber: Type.String({ pattern: "^[0-9]+$" }),
	commentId: Type.String(),
});

export const ReactionDeleteParamsSchema = Type.Object({
	emoji: Type.String(),
	user: Type.String(),
});

export const ReactionListQuerySchema = Type.Object({
	emoji: Type.Optional(Type.String()),
});

export type ReactionCreateRequest = Static<typeof ReactionCreateSchema>;
export type ReactionResponse = Static<typeof ReactionResponseSchema>;

/**
 * Fork Schemas
 */
export const ForkCreateSchema = Type.Object({
	fork_owner: Type.String({ minLength: 1 }),
	fork_repo: Type.String({ minLength: 1 }),
});

export const ForkResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		original_owner: Type.String(),
		original_repo: Type.String(),
		fork_owner: Type.String(),
		fork_repo: Type.String(),
	}),
]);

export const ForkParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
	forkedOwner: Type.String(),
	forkedRepo: Type.String(),
});

export const ForkListParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
});

export type ForkCreateRequest = Static<typeof ForkCreateSchema>;
export type ForkResponse = Static<typeof ForkResponseSchema>;

/**
 * Star Schemas
 */
export const StarResponseSchema = Type.Intersect([
	BaseResponseSchema,
	Type.Object({
		username: Type.String(),
		repo_owner: Type.String(),
		repo_name: Type.String(),
	}),
]);

export const StarParamsSchema = Type.Object({
	owner: Type.String(),
	repoName: Type.String(),
});

export type StarResponse = Static<typeof StarResponseSchema>;
