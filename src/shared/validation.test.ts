import {
	validateUsername,
	validateEmail,
	validateRepoName,
	validateOrgName,
	isValidUsername,
	isValidEmail,
	isValidRepoName,
	isValidOrgName,
} from "../validation";
import { ValidationError } from "../errors";

describe("Username Validation", () => {
	describe("validateUsername", () => {
		it("should pass for valid usernames", () => {
			expect(() => validateUsername("johndoe")).not.toThrow();
			expect(() => validateUsername("john_doe")).not.toThrow();
			expect(() => validateUsername("john-doe")).not.toThrow();
			expect(() => validateUsername("JohnDoe123")).not.toThrow();
			expect(() => validateUsername("a")).not.toThrow();
		});

		it("should throw ValidationError for invalid usernames", () => {
			expect(() => validateUsername("")).toThrow(ValidationError);
			expect(() => validateUsername("john.doe")).toThrow(ValidationError);
			expect(() => validateUsername("john doe")).toThrow(ValidationError);
			expect(() => validateUsername("john@doe")).toThrow(ValidationError);
			expect(() => validateUsername("john#doe")).toThrow(ValidationError);
		});

		it("should throw ValidationError for too long usernames", () => {
			const longUsername = "a".repeat(40);
			expect(() => validateUsername(longUsername)).toThrow(ValidationError);
		});
	});

	describe("isValidUsername", () => {
		it("should return true for valid usernames", () => {
			expect(isValidUsername("johndoe")).toBe(true);
			expect(isValidUsername("john_doe")).toBe(true);
			expect(isValidUsername("john-doe")).toBe(true);
		});

		it("should return false for invalid usernames", () => {
			expect(isValidUsername("")).toBe(false);
			expect(isValidUsername("john.doe")).toBe(false);
			expect(isValidUsername("john doe")).toBe(false);
		});
	});
});

describe("Email Validation", () => {
	describe("validateEmail", () => {
		it("should pass for valid emails", () => {
			expect(() => validateEmail("user@example.com")).not.toThrow();
			expect(() => validateEmail("john.doe@company.org")).not.toThrow();
			expect(() => validateEmail("test+tag@domain.co.uk")).not.toThrow();
		});

		it("should throw ValidationError for invalid emails", () => {
			expect(() => validateEmail("")).toThrow(ValidationError);
			expect(() => validateEmail("invalid")).toThrow(ValidationError);
			expect(() => validateEmail("@domain.com")).toThrow(ValidationError);
			expect(() => validateEmail("user@")).toThrow(ValidationError);
			expect(() => validateEmail("user@domain")).toThrow(ValidationError);
		});
	});

	describe("isValidEmail", () => {
		it("should return true for valid emails", () => {
			expect(isValidEmail("user@example.com")).toBe(true);
			expect(isValidEmail("john.doe@company.org")).toBe(true);
		});

		it("should return false for invalid emails", () => {
			expect(isValidEmail("")).toBe(false);
			expect(isValidEmail("invalid")).toBe(false);
			expect(isValidEmail("@domain.com")).toBe(false);
		});
	});
});

describe("Repository Name Validation", () => {
	describe("validateRepoName", () => {
		it("should pass for valid repository names", () => {
			expect(() => validateRepoName("my-repo")).not.toThrow();
			expect(() => validateRepoName("my_repo")).not.toThrow();
			expect(() => validateRepoName("my.repo")).not.toThrow();
			expect(() => validateRepoName("MyRepo123")).not.toThrow();
		});

		it("should throw ValidationError for invalid repository names", () => {
			expect(() => validateRepoName("")).toThrow(ValidationError);
			expect(() => validateRepoName("my repo")).toThrow(ValidationError);
			expect(() => validateRepoName("my@repo")).toThrow(ValidationError);
			expect(() => validateRepoName("my#repo")).toThrow(ValidationError);
		});

		it("should throw ValidationError for reserved names", () => {
			expect(() => validateRepoName(".")).toThrow(ValidationError);
			expect(() => validateRepoName("..")).toThrow(ValidationError);
		});
	});

	describe("isValidRepoName", () => {
		it("should return true for valid repository names", () => {
			expect(isValidRepoName("my-repo")).toBe(true);
			expect(isValidRepoName("my_repo")).toBe(true);
			expect(isValidRepoName("my.repo")).toBe(true);
		});

		it("should return false for invalid repository names", () => {
			expect(isValidRepoName("")).toBe(false);
			expect(isValidRepoName("my repo")).toBe(false);
			expect(isValidRepoName(".")).toBe(false);
		});
	});
});

describe("Organization Name Validation", () => {
	describe("validateOrgName", () => {
		it("should pass for valid organization names", () => {
			expect(() => validateOrgName("my-org")).not.toThrow();
			expect(() => validateOrgName("my_org")).not.toThrow();
			expect(() => validateOrgName("MyOrg123")).not.toThrow();
		});

		it("should throw ValidationError for invalid organization names", () => {
			expect(() => validateOrgName("")).toThrow(ValidationError);
			expect(() => validateOrgName("my.org")).toThrow(ValidationError);
			expect(() => validateOrgName("my org")).toThrow(ValidationError);
			expect(() => validateOrgName("my@org")).toThrow(ValidationError);
		});
	});

	describe("isValidOrgName", () => {
		it("should return true for valid organization names", () => {
			expect(isValidOrgName("my-org")).toBe(true);
			expect(isValidOrgName("my_org")).toBe(true);
			expect(isValidOrgName("MyOrg123")).toBe(true);
		});

		it("should return false for invalid organization names", () => {
			expect(isValidOrgName("")).toBe(false);
			expect(isValidOrgName("my.org")).toBe(false);
			expect(isValidOrgName("my org")).toBe(false);
		});
	});
});
