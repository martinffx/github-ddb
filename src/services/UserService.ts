import type { UserRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type {
	UserCreateRequest,
	UserUpdateRequest,
	UserResponse,
} from "../routes/schema";
import { UserEntity } from "./entities";

class UserService {
	private readonly userRepo: UserRepository;

	constructor(repo: UserRepository) {
		this.userRepo = repo;
	}

	/**
	 * Creates a new user with the provided details
	 * @param request - User creation data including username, email, and optional bio/payment plan
	 * @returns User response with timestamps
	 * @throws {DuplicateEntityError} If username already exists
	 * @throws {ValidationError} If user data is invalid
	 */
	public async createUser(request: UserCreateRequest): Promise<UserResponse> {
		const entity = UserEntity.fromRequest(request);
		const createdEntity = await this.userRepo.createUser(entity);
		return createdEntity.toResponse();
	}

	/**
	 * Retrieves a user by their username
	 * @param username - The username to look up
	 * @returns User response with all user data
	 * @throws {EntityNotFoundError} If user does not exist
	 */
	public async getUser(username: string): Promise<UserResponse> {
		const user = await this.userRepo.getUser(username);

		if (user === undefined) {
			throw new EntityNotFoundError("UserEntity", username);
		}

		return user.toResponse();
	}

	/**
	 * Updates an existing user with new data (partial updates supported)
	 * @param username - The username of the user to update
	 * @param request - User update data (email, bio, and/or payment_plan_id)
	 * @returns Updated user response with new data
	 * @throws {EntityNotFoundError} If user does not exist
	 * @throws {ValidationError} If update data is invalid
	 */
	public async updateUser(
		username: string,
		request: UserUpdateRequest,
	): Promise<UserResponse> {
		// First check if user exists
		const existingUser = await this.userRepo.getUser(username);

		if (existingUser === undefined) {
			throw new EntityNotFoundError("UserEntity", username);
		}

		// Update the entity with new data
		const updatedEntity = existingUser.updateUser({
			email: request.email,
			bio: request.bio,
			paymentPlanId: request.payment_plan_id,
		});

		// Save and return
		const savedEntity = await this.userRepo.updateUser(updatedEntity);
		return savedEntity.toResponse();
	}

	/**
	 * Deletes a user by username
	 * @param username - The username of the user to delete
	 * @returns Promise that resolves when deletion is complete
	 * @throws {EntityNotFoundError} If user does not exist
	 */
	public async deleteUser(username: string): Promise<void> {
		// First check if user exists
		const existingUser = await this.userRepo.getUser(username);

		if (existingUser === undefined) {
			throw new EntityNotFoundError("UserEntity", username);
		}

		await this.userRepo.deleteUser(username);
	}
}

export { UserService };
