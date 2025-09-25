import type { UserRepository } from "../repos";
import type { UserEntity } from "./entities";

class UserService {
  private readonly repo: UserRepository;

  constructor(repo: UserRepository) {
    this.repo = repo;
  }

  public getUser(_username: string): UserEntity {
    throw new Error("Not Implemented");
  }
}

export { UserService };
