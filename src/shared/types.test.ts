import type {
	UserCreateRequest,
	UserUpdateRequest,
	UserResponse,
	OrganizationCreateRequest,
	OrganizationUpdateRequest,
	OrganizationResponse,
	RepositoryCreateRequest,
	RepositoryUpdateRequest,
	RepositoryResponse,
	PaginatedResponse,
	BaseResponse,
} from "../types";

describe("Type Definitions", () => {
	describe("User Types", () => {
		it("should define UserCreateRequest with required fields", () => {
			const request: UserCreateRequest = {
				username: "johndoe",
				email: "john@example.com",
			};

			expect(request.username).toBe("johndoe");
			expect(request.email).toBe("john@example.com");
		});

		it("should define UserCreateRequest with optional fields", () => {
			const request: UserCreateRequest = {
				username: "johndoe",
				email: "john@example.com",
				bio: "Software developer",
				payment_plan_id: "premium",
			};

			expect(request.bio).toBe("Software developer");
			expect(request.payment_plan_id).toBe("premium");
		});

		it("should define UserUpdateRequest with all optional fields", () => {
			const request: UserUpdateRequest = {
				email: "newemail@example.com",
			};

			expect(request.email).toBe("newemail@example.com");
		});

		it("should define UserResponse with all fields", () => {
			const response: UserResponse = {
				username: "johndoe",
				email: "john@example.com",
				bio: "Software developer",
				payment_plan_id: "premium",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			};

			expect(response.username).toBe("johndoe");
			expect(response.created_at).toBe("2024-01-01T00:00:00Z");
		});
	});

	describe("Organization Types", () => {
		it("should define OrganizationCreateRequest with required fields", () => {
			const request: OrganizationCreateRequest = {
				org_name: "my-org",
			};

			expect(request.org_name).toBe("my-org");
		});

		it("should define OrganizationResponse with all fields", () => {
			const response: OrganizationResponse = {
				org_name: "my-org",
				description: "My organization",
				payment_plan_id: "enterprise",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			};

			expect(response.org_name).toBe("my-org");
			expect(response.description).toBe("My organization");
		});
	});

	describe("Repository Types", () => {
		it("should define RepositoryCreateRequest with required fields", () => {
			const request: RepositoryCreateRequest = {
				owner: "johndoe",
				repo_name: "my-repo",
			};

			expect(request.owner).toBe("johndoe");
			expect(request.repo_name).toBe("my-repo");
		});

		it("should define RepositoryResponse with all fields", () => {
			const response: RepositoryResponse = {
				owner: "johndoe",
				repo_name: "my-repo",
				description: "My repository",
				is_private: false,
				language: "TypeScript",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			};

			expect(response.owner).toBe("johndoe");
			expect(response.is_private).toBe(false);
		});
	});

	describe("Utility Types", () => {
		it("should define PaginatedResponse", () => {
			const response: PaginatedResponse<UserResponse> = {
				items: [
					{
						username: "johndoe",
						email: "john@example.com",
						created_at: "2024-01-01T00:00:00Z",
						updated_at: "2024-01-01T00:00:00Z",
					},
				],
				next_cursor: "cursor123",
				has_more: false,
			};

			expect(response.items).toHaveLength(1);
			expect(response.next_cursor).toBe("cursor123");
			expect(response.has_more).toBe(false);
		});

		it("should define BaseResponse", () => {
			const response: BaseResponse = {
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			};

			expect(response.created_at).toBe("2024-01-01T00:00:00Z");
			expect(response.updated_at).toBe("2024-01-01T00:00:00Z");
		});
	});
});
