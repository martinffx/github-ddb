import { ValidationError } from "./errors";

/**
 * Username validation patterns and utilities
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_USERNAME_LENGTH = 39;

/**
 * Email validation pattern
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Repository name validation pattern
 */
const REPO_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const RESERVED_REPO_NAMES = [".", ".."];

/**
 * Organization name validation pattern (similar to username but no dots)
 */
const ORG_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_ORG_NAME_LENGTH = 39;

/**
 * Validate username format and length
 * @throws ValidationError if validation fails
 */
export function validateUsername(username: string): void {
	if (!username || username.length === 0) {
		throw new ValidationError("username", "Username is required");
	}

	if (username.length > MAX_USERNAME_LENGTH) {
		throw new ValidationError(
			"username",
			`Username must be ${MAX_USERNAME_LENGTH} characters or less`,
		);
	}

	if (!USERNAME_PATTERN.test(username)) {
		throw new ValidationError(
			"username",
			"Username can only contain letters, numbers, hyphens, and underscores",
		);
	}
}

/**
 * Validate email format
 * @throws ValidationError if validation fails
 */
export function validateEmail(email: string): void {
	if (!email || email.length === 0) {
		throw new ValidationError("email", "Email is required");
	}

	if (!EMAIL_PATTERN.test(email)) {
		throw new ValidationError("email", "Invalid email format");
	}
}

/**
 * Validate repository name format
 * @throws ValidationError if validation fails
 */
export function validateRepoName(repoName: string): void {
	if (!repoName || repoName.length === 0) {
		throw new ValidationError("repo_name", "Repository name is required");
	}

	if (RESERVED_REPO_NAMES.includes(repoName)) {
		throw new ValidationError("repo_name", "Repository name is reserved");
	}

	if (!REPO_NAME_PATTERN.test(repoName)) {
		throw new ValidationError(
			"repo_name",
			"Repository name can only contain letters, numbers, hyphens, underscores, and dots",
		);
	}
}

/**
 * Validate organization name format and length
 * @throws ValidationError if validation fails
 */
export function validateOrgName(orgName: string): void {
	if (!orgName || orgName.length === 0) {
		throw new ValidationError("org_name", "Organization name is required");
	}

	if (orgName.length > MAX_ORG_NAME_LENGTH) {
		throw new ValidationError(
			"org_name",
			`Organization name must be ${MAX_ORG_NAME_LENGTH} characters or less`,
		);
	}

	if (!ORG_NAME_PATTERN.test(orgName)) {
		throw new ValidationError(
			"org_name",
			"Organization name can only contain letters, numbers, hyphens, and underscores",
		);
	}
}

/**
 * Check if username is valid (non-throwing version)
 */
export function isValidUsername(username: string): boolean {
	try {
		validateUsername(username);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if email is valid (non-throwing version)
 */
export function isValidEmail(email: string): boolean {
	try {
		validateEmail(email);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if repository name is valid (non-throwing version)
 */
export function isValidRepoName(repoName: string): boolean {
	try {
		validateRepoName(repoName);
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if organization name is valid (non-throwing version)
 */
export function isValidOrgName(orgName: string): boolean {
	try {
		validateOrgName(orgName);
		return true;
	} catch {
		return false;
	}
}
