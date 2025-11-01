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

/**
 * Organization Routes Plugin
 * Registers all organization-related HTTP endpoints
 */
export const OrganizationRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance,
) => {
	const { organizationService } = fastify.services;

	/**
	 * POST / - Create a new organization
	 */
	fastify.post<{
		Body: OrganizationCreateRequest;
		Reply: OrganizationResponse;
	}>(
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
			const result = await organizationService.createOrganization(request.body);
			return reply.code(201).send(result);
		},
	);

	/**
	 * GET /:orgName - Retrieve an organization by name
	 */
	fastify.get<{
		Params: { orgName: string };
		Reply: OrganizationResponse;
	}>(
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
			const result = await organizationService.getOrganization(
				request.params.orgName,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * PUT /:orgName - Update an existing organization
	 */
	fastify.put<{
		Params: { orgName: string };
		Body: OrganizationUpdateRequest;
		Reply: OrganizationResponse;
	}>(
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
			const result = await organizationService.updateOrganization(
				request.params.orgName,
				request.body,
			);
			return reply.code(200).send(result);
		},
	);

	/**
	 * DELETE /:orgName - Delete an organization
	 */
	fastify.delete<{
		Params: { orgName: string };
	}>(
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
			await organizationService.deleteOrganization(request.params.orgName);
			return reply.code(204).send();
		},
	);
};
