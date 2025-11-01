import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	OrganizationCreateSchema,
	OrganizationUpdateSchema,
	OrganizationResponseSchema,
	OrganizationParamsSchema,
	type OrganizationCreateRequest,
	type OrganizationUpdateRequest,
	type OrganizationResponse,
} from "./schema";

interface OrganizationCreateRoute {
	Body: OrganizationCreateRequest;
	Reply: OrganizationResponse;
}

interface OrganizationGetRoute {
	Params: { orgName: string };
	Reply: OrganizationResponse;
}

interface OrganizationUpdateRoute {
	Params: { orgName: string };
	Body: OrganizationUpdateRequest;
	Reply: OrganizationResponse;
}

interface OrganizationDeleteRoute {
	Params: { orgName: string };
}

/**
 * Organziation Routes Plugin
 * Registers all organization-related HTTP endpoints
 */
export const OrganizationRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	// Get organizationService from fastify decorator
	const { organizationService } = fastify.services;

	/**
	 * POST / - Create a new organization
	 */
	fastify.post<OrganizationCreateRoute>(
		"/",
		{
			schema: {
				tags: ["Organization"],
				operationId: "createOrganization",
				description: "Create a new organization",
				body: OrganizationCreateSchema,
				response: {
					201: OrganizationResponseSchema,
				},
			},
		},
		async (request, reply) => {
			// Create organization via service
			const result = await organizationService.createOrganization(request.body);

			// Return 201 Created
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:orgName - Retrieve an organization by name
	 */
	fastify.get<OrganizationGetRoute>(
		"/:orgName",
		{
			schema: {
				tags: ["Organization"],
				operationId: "getOrganization",
				description: "Get an organization by name",
				params: OrganizationParamsSchema,
				response: {
					200: OrganizationResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { orgName } = request.params;

			// Get organization via service
			const result = await organizationService.getOrganization(orgName);

			// Return 200 OK
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:orgName - Update an existing organization
	 */
	fastify.put<OrganizationUpdateRoute>(
		"/:orgName",
		{
			schema: {
				tags: ["Organization"],
				operationId: "updateOrganization",
				description: "Update an existing organization",
				params: OrganizationParamsSchema,
				body: OrganizationUpdateSchema,
				response: {
					200: OrganizationResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { orgName } = request.params;

			// Update organization via service
			const result = await organizationService.updateOrganization(
				orgName,
				request.body,
			);

			// Return 200 OK
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:orgName - Delete an organization
	 */
	fastify.delete<OrganizationDeleteRoute>(
		"/:orgName",
		{
			schema: {
				tags: ["Organization"],
				operationId: "deleteOrganization",
				description: "Delete an organization",
				params: OrganizationParamsSchema,
				response: {
					204: { type: "null" },
				},
			},
		},
		async (request, reply) => {
			const { orgName } = request.params;

			// Delete organization via service
			await organizationService.deleteOrganization(orgName);

			// Return 204 No Content
			return reply.code(204).send();
		},
	);
};
