/**
 * Base class for HTTP errors that implement RFC 9457 Problem Details
 */
abstract class HttpError<T = Record<string, unknown>> extends Error {
	abstract readonly statusCode: number;
	readonly details?: T;

	constructor(message: string, details?: T) {
		super(message);
		this.details = details;
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * Returns RFC 9457 Problem Details object
	 */
	toProblemDetail(): Record<string, unknown> {
		return {
			type: `https://example.com/errors/${this.name}`,
			title: this.getTitle(),
			status: this.statusCode,
			detail: this.message,
			...this.getExtensions(),
		};
	}

	protected abstract getTitle(): string;

	protected getExtensions(): Record<string, unknown> {
		return (this.details as Record<string, unknown>) || {};
	}
}

/**
 * 400 Bad Request - For validation errors, malformed requests
 */
export class BadRequestError extends HttpError {
	readonly statusCode = 400;
	protected getTitle() {
		return "Bad Request";
	}
}

/**
 * 401 Unauthorized - For authentication failures
 */
export class UnauthorizedError extends HttpError {
	readonly statusCode = 401;
	protected getTitle() {
		return "Unauthorized";
	}
}

/**
 * 403 Forbidden - For authorization failures
 */
export class ForbiddenError extends HttpError {
	readonly statusCode = 403;
	protected getTitle() {
		return "Forbidden";
	}
}

/**
 * 404 Not Found - For non-existent resources
 */
export class NotFoundError extends HttpError {
	readonly statusCode = 404;
	protected getTitle() {
		return "Not Found";
	}
}

/**
 * 405 Method Not Allowed - For unsupported HTTP methods
 */
export class MethodNotAllowedError extends HttpError {
	readonly statusCode = 405;
	protected getTitle() {
		return "Method Not Allowed";
	}
}

/**
 * 409 Conflict - For conflicts like duplicates
 */
export class ConflictError extends HttpError {
	readonly statusCode = 409;
	protected getTitle() {
		return "Conflict";
	}
}

/**
 * 500 Internal Server Error - For unexpected server errors
 */
export class InternalServerError extends HttpError {
	readonly statusCode = 500;
	protected getTitle() {
		return "Internal Server Error";
	}
}

/**
 * Domain-specific error for validation failures
 */
export class ValidationError extends BadRequestError {
	public readonly field: string | string[];

	constructor(field: string | string[], message: string) {
		super(message, { field });
		this.field = field;
	}
}

/**
 * Domain-specific error for duplicate entity attempts
 */
export class DuplicateEntityError extends ConflictError {
	public readonly entityType: string;
	public readonly pk: string;

	constructor(entityType: string, pk: string) {
		super(`${entityType} '${pk}' already exists`, { entityType, pk });
		this.entityType = entityType;
		this.pk = pk;
	}
}

/**
 * Domain-specific error for entity not found
 */
export class EntityNotFoundError extends NotFoundError {
	public readonly entityType: string;
	public readonly pk: string;

	constructor(entityType: string, pk: string) {
		super(`${entityType} '${pk}' not found`, { entityType, pk });
		this.entityType = entityType;
		this.pk = pk;
	}
}
