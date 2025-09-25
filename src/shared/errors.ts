/**
 * Domain-specific error for validation failures
 */
export class ValidationError extends Error {
	public readonly name = "ValidationError";
	public readonly field: string | string[];

	constructor(field: string | string[], message: string) {
		super(message);
		this.field = field;
		Error.captureStackTrace(this, ValidationError);
	}
}

/**
 * Domain-specific error for duplicate entity attempts
 */
export class DuplicateEntityError extends Error {
	public readonly name = "DuplicateEntityError";
	public readonly entityType: string;
	public readonly field: string | string[];
	// biome-ignore lint/suspicious/noExplicitAny: Generic type for flexibility
	public readonly value: any;

	constructor(
		entityType: string,
		field: string | string[],
		// biome-ignore lint/suspicious/noExplicitAny: Generic type for flexibility
		value: any,
	) {
		const fieldStr = Array.isArray(field) ? field.join(",") : field;
		const valueStr = Array.isArray(value) ? value.join(",") : value;
		super(`${entityType} with ${fieldStr} '${valueStr}' already exists`);

		this.entityType = entityType;
		this.field = field;
		this.value = value;
		Error.captureStackTrace(this, DuplicateEntityError);
	}
}

/**
 * Domain-specific error for entity not found
 */
export class EntityNotFoundError extends Error {
	public readonly name = "EntityNotFoundError";
	public readonly entityType: string;
	public readonly field: string | string[];
	// biome-ignore lint/suspicious/noExplicitAny: Generic type for flexibility
	public readonly value: any;

	constructor(
		entityType: string,
		field: string | string[],
		// biome-ignore lint/suspicious/noExplicitAny: Generic type for flexibility
		value: any,
	) {
		const fieldStr = Array.isArray(field) ? field.join(",") : field;
		const valueStr = Array.isArray(value) ? value.join(",") : value;
		super(`${entityType} with ${fieldStr} '${valueStr}' not found`);

		this.entityType = entityType;
		this.field = field;
		this.value = value;
		Error.captureStackTrace(this, EntityNotFoundError);
	}
}
