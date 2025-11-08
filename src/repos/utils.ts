import {
	ConditionalCheckFailedException,
	TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBToolboxError } from "dynamodb-toolbox";
import {
	DuplicateEntityError,
	EntityNotFoundError,
	ValidationError,
} from "../shared";

/**
 * Handles errors from create operations with duplicate check.
 * Transforms ConditionalCheckFailed into DuplicateEntityError (409).
 *
 * @param error - The caught error
 * @param entityType - The entity type name (e.g., "UserEntity")
 * @param pk - The primary key value
 * @throws DuplicateEntityError when entity already exists
 * @throws ValidationError for DynamoDB toolbox errors
 * @throws Original error for unexpected errors
 */
export function handleCreateError(
	error: unknown,
	entityType: string,
	pk: string,
): never {
	if (error instanceof ConditionalCheckFailedException) {
		throw new DuplicateEntityError(entityType, pk);
	}
	if (error instanceof DynamoDBToolboxError) {
		throw new ValidationError(error.path ?? "entity", error.message);
	}
	throw error;
}

/**
 * Handles errors from update operations with existence check.
 * Transforms ConditionalCheckFailed into EntityNotFoundError (404).
 *
 * @param error - The caught error
 * @param entityType - The entity type name (e.g., "UserEntity")
 * @param pk - The primary key value
 * @throws EntityNotFoundError when entity doesn't exist
 * @throws ValidationError for DynamoDB toolbox errors
 * @throws Original error for unexpected errors
 */
export function handleUpdateError(
	error: unknown,
	entityType: string,
	pk: string,
): never {
	if (error instanceof ConditionalCheckFailedException) {
		throw new EntityNotFoundError(entityType, pk);
	}
	if (error instanceof DynamoDBToolboxError) {
		throw new ValidationError(error.path ?? "entity", error.message);
	}
	throw error;
}

/**
 * Handles errors from transaction operations by inspecting cancellation reasons.
 *
 * This approach inspects TransactionCanceledException.CancellationReasons to determine
 * which transaction failed, avoiding extra DynamoDB lookups.
 *
 * Common pattern: 2-transaction create with duplicate and parent checks
 * - Transaction 0: Put entity with attribute_not_exists condition (duplicate check)
 * - Transaction 1: ConditionCheck on parent entity (parent exists check)
 *
 * @param error - The caught error
 * @param options - Configuration object
 * @param options.entityType - The entity type name (e.g., "IssueCommentEntity")
 * @param options.entityKey - The entity key for duplicate error
 * @param options.parentEntityType - The parent entity type (e.g., "IssueEntity")
 * @param options.parentEntityKey - The parent entity key for not found error
 * @param options.operationName - Operation name for fallback error (e.g., "comment")
 * @throws DuplicateEntityError when transaction 0 fails (entity already exists)
 * @throws EntityNotFoundError when transaction 1 fails (parent doesn't exist)
 * @throws ValidationError for DynamoDB toolbox errors or unexpected transaction failures
 * @throws Original error for unexpected errors
 *
 * @example
 * try {
 *   await execute(TransactWriteCommand).params({ TransactItems: [...] }).send();
 * } catch (error) {
 *   handleTransactionError(error, {
 *     entityType: "IssueCommentEntity",
 *     entityKey: comment.getEntityKey(),
 *     parentEntityType: "IssueEntity",
 *     parentEntityKey: comment.getParentEntityKey(),
 *     operationName: "comment"
 *   });
 * }
 */
export function handleTransactionError(
	error: unknown,
	options: {
		entityType: string;
		entityKey: string;
		parentEntityType: string;
		parentEntityKey: string;
		operationName: string;
	},
): never {
	if (error instanceof TransactionCanceledException) {
		// Check cancellation reasons to determine which condition failed
		const reasons = error.CancellationReasons || [];

		// Ensure we have the expected transaction count
		if (reasons.length < 2) {
			throw new ValidationError(
				"transaction",
				`Transaction failed with unexpected cancellation reason count: ${reasons.length}`,
			);
		}

		// First transaction is the entity put (duplicate check)
		if (reasons[0]?.Code === "ConditionalCheckFailed") {
			throw new DuplicateEntityError(options.entityType, options.entityKey);
		}

		// Second transaction is the parent check (existence check)
		if (reasons[1]?.Code === "ConditionalCheckFailed") {
			throw new EntityNotFoundError(
				options.parentEntityType,
				options.parentEntityKey,
			);
		}

		// Fallback for unknown transaction failure
		throw new ValidationError(
			options.operationName,
			`Failed to create ${options.operationName} due to transaction conflict: ${reasons.map((r) => r.Code).join(", ")}`,
		);
	}
	if (error instanceof DynamoDBToolboxError) {
		throw new ValidationError(
			error.path ?? options.operationName,
			error.message,
		);
	}
	throw error;
}
