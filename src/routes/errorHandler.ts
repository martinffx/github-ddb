/**
 * Error Handler Plugin
 * Global error handler for domain-specific and unexpected errors
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import {
	BadRequestError,
	DuplicateEntityError,
	EntityNotFoundError,
	InternalServerError,
	ValidationError,
} from "../shared";

export const errorHandlerPlugin = fp(
	async (fastify: FastifyInstance) => {
		fastify.setErrorHandler((error, request, reply) => {
			// Handle Fastify schema validation errors
			if (error.validation || error.code === "FST_ERR_VALIDATION") {
				const validationError = new BadRequestError(error.message);
				reply.code(400).send(validationError.toProblemDetail());
				return;
			}

			// Handle domain-specific errors with appropriate status codes
			if (error instanceof DuplicateEntityError) {
				reply.code(409).send(error.toProblemDetail());
				return;
			}

			if (error instanceof ValidationError) {
				reply.code(400).send(error.toProblemDetail());
				return;
			}

			if (error instanceof BadRequestError) {
				reply.code(400).send(error.toProblemDetail());
				return;
			}

			if (error instanceof EntityNotFoundError) {
				reply.code(404).send(error.toProblemDetail());
				return;
			}

			// Log unexpected errors with full context
			fastify.log.error(
				{
					err: error,
					request: {
						method: request.method,
						url: request.url,
						params: request.params,
						query: request.query,
					},
				},
				"Unexpected error occurred",
			);

			// Return generic 500 error to client
			const internalError = new InternalServerError(
				"An unexpected error occurred",
			);
			reply.code(500).send(internalError.toProblemDetail());
		});
	},
	{
		name: "errorhandler",
	},
);
