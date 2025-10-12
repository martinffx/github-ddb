import type { UserRepository } from "../repos";
import { EntityNotFoundError } from "../shared";
import type { UserEntity } from "./entities";

class UserService {
	private readonly userRepo: UserRepository;

	constructor(repo: UserRepository) {
		this.userRepo = repo;
	}

	public async getUser(username: string): Promise<UserEntity> {
		const user = await this.userRepo.getUser(username);

		if (user === undefined) {
			throw new EntityNotFoundError("UserEntity", username);
		}

		return user;
	}
}

export { UserService };
