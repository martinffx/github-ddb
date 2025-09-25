import {
  ValidationError,
  DuplicateEntityError,
  EntityNotFoundError,
} from "./errors";

describe("ValidationError", () => {
  it("should create validation error with field and message", () => {
    const error = new ValidationError("username", "Invalid format");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ValidationError");
    expect(error.field).toBe("username");
    expect(error.message).toBe("Invalid format");
  });

  it("should create validation error with multiple fields", () => {
    const error = new ValidationError(
      ["username", "email"],
      "Multiple validation errors",
    );

    expect(error.field).toEqual(["username", "email"]);
    expect(error.message).toBe("Multiple validation errors");
  });

  it("should have proper error stack", () => {
    const error = new ValidationError("email", "Invalid email format");
    expect(error.stack).toBeDefined();
  });
});

describe("DuplicateEntityError", () => {
  it("should create duplicate entity error with entity type and identifier", () => {
    const error = new DuplicateEntityError("User", "username", "johndoe");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DuplicateEntityError");
    expect(error.entityType).toBe("User");
    expect(error.field).toBe("username");
    expect(error.value).toBe("johndoe");
    expect(error.message).toBe("User with username 'johndoe' already exists");
  });

  it("should create duplicate entity error with composite identifier", () => {
    const error = new DuplicateEntityError(
      "Repository",
      ["owner", "repo_name"],
      ["johndoe", "my-repo"],
    );

    expect(error.entityType).toBe("Repository");
    expect(error.field).toEqual(["owner", "repo_name"]);
    expect(error.value).toEqual(["johndoe", "my-repo"]);
    expect(error.message).toBe(
      "Repository with owner,repo_name 'johndoe,my-repo' already exists",
    );
  });

  it("should have proper error stack", () => {
    const error = new DuplicateEntityError("User", "username", "johndoe");
    expect(error.stack).toBeDefined();
  });
});

describe("EntityNotFoundError", () => {
  it("should create not found error with entity type and identifier", () => {
    const error = new EntityNotFoundError("User", "username", "johndoe");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("EntityNotFoundError");
    expect(error.entityType).toBe("User");
    expect(error.field).toBe("username");
    expect(error.value).toBe("johndoe");
    expect(error.message).toBe("User with username 'johndoe' not found");
  });

  it("should create not found error with composite identifier", () => {
    const error = new EntityNotFoundError(
      "Repository",
      ["owner", "repo_name"],
      ["johndoe", "my-repo"],
    );

    expect(error.entityType).toBe("Repository");
    expect(error.field).toEqual(["owner", "repo_name"]);
    expect(error.value).toEqual(["johndoe", "my-repo"]);
    expect(error.message).toBe(
      "Repository with owner,repo_name 'johndoe,my-repo' not found",
    );
  });

  it("should have proper error stack", () => {
    const error = new EntityNotFoundError("User", "username", "johndoe");
    expect(error.stack).toBeDefined();
  });
});
