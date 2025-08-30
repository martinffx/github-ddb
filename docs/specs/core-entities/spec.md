# Core Entities Feature Specification

## Feature Overview

**Feature:** core-entities  
**User Story:** As a backend developer, I want to set up core DynamoDB entities (User, Organization, Repository) with proper table configuration so that I can build the foundation for the GitHub data model implementation.

This feature establishes the foundational data layer for our GitHub-style application using DynamoDB's single table design pattern. It implements the three core entity types that form the backbone of the system: Users, Organizations, and Repositories.

## Acceptance Criteria

### AC-1: DynamoDB Table Configuration
**GIVEN** a new project setup  
**WHEN** I configure the DynamoDB table  
**THEN** it includes the main table with GSI1, GSI2, GSI3, and GSI4 indexes properly configured

### AC-2: User Entity Implementation
**GIVEN** User entity requirements  
**WHEN** I create a User record  
**THEN** it uses ACCOUNT#<username> as PK/SK and supports CRUD operations via repository methods

### AC-3: Organization Entity Implementation
**GIVEN** Organization entity requirements  
**WHEN** I create an Organization record  
**THEN** it uses ACCOUNT#<orgname> as PK/SK and supports CRUD operations via repository methods

### AC-4: Repository Entity Implementation
**GIVEN** Repository entity requirements  
**WHEN** I create a Repository record  
**THEN** it uses REPO#<owner>#<reponame> as PK/SK and supports CRUD operations via repository methods

### AC-5: Single Table Design Compliance
**GIVEN** any core entity  
**WHEN** I perform operations  
**THEN** all entities follow single table design patterns with proper key generation and validation

## Business Rules

### BR-1: Global Username/Organization Uniqueness
Usernames and organization names must be unique globally (enforced by ACCOUNT# prefix collision detection). This prevents naming conflicts and ensures clear identity resolution across the system.

### BR-2: Repository Name Uniqueness per Owner
Repository names must be unique per owner (enforced by REPO#<owner>#<reponame> composite key). This follows GitHub's model where repository names only need to be unique within an owner's namespace.

### BR-3: Composite Key Pattern Compliance
All primary and sort keys must follow the composite key patterns defined in the ERD. This ensures consistent access patterns and proper data distribution across partitions.

### BR-4: GSI Index Configuration
GSI indexes must be properly configured to support the defined access patterns for account and repository queries. Each GSI serves specific query patterns and must be optimized accordingly.

### BR-5: Sparse GSI Pattern
GSI attributes are only populated for entities that use those specific indexes (sparse GSI pattern). This optimizes storage costs and query performance by only indexing relevant data.

## Technical Implementation Details

### DynamoDB Table Design

**Main Table:** GitHubTable
- **Partition Key:** PK (String)
- **Sort Key:** SK (String)

**Global Secondary Indexes:**

#### GSI1 - Account and PR Queries
- **Partition Key:** GSI1PK (String)
- **Sort Key:** GSI1SK (String)
- **Purpose:** Account queries, PR lists by repo

#### GSI2 - Repository Lookup
- **Partition Key:** GSI2PK (String)
- **Sort Key:** GSI2SK (String)
- **Purpose:** Repo lookup, fork relationships

#### GSI3 - Account-Based Queries
- **Partition Key:** GSI3PK (String)
- **Sort Key:** GSI3SK (String)
- **Purpose:** Recent repos by account, user/org lookup

#### GSI4 - Repository Metadata
- **Partition Key:** GSI4PK (String)
- **Sort Key:** GSI4SK (String)
- **Purpose:** Repo metadata, issue status queries

### Entity Key Patterns

#### User Entity
```
PK: ACCOUNT#<username>
SK: ACCOUNT#<username>
GSI1PK: ACCOUNT#<username>
GSI1SK: ACCOUNT#<username>
GSI3PK: ACCOUNT#<username>
GSI3SK: ACCOUNT#<username>
```

#### Organization Entity
```
PK: ACCOUNT#<orgname>
SK: ACCOUNT#<orgname>
GSI1PK: ACCOUNT#<orgname>
GSI1SK: ACCOUNT#<orgname>
GSI3PK: ACCOUNT#<orgname>
GSI3SK: ACCOUNT#<orgname>
```

#### Repository Entity
```
PK: REPO#<owner>#<reponame>
SK: REPO#<owner>#<reponame>
GSI1PK: REPO#<owner>#<reponame>
GSI1SK: REPO#<owner>#<reponame>
GSI2PK: REPO#<owner>#<reponame>
GSI2SK: REPO#<owner>#<reponame>
GSI3PK: ACCOUNT#<owner>
GSI3SK: #<updated_at>
```

### Entity Attributes

#### User Attributes
- `username` - Unique identifier for the user
- `email` - User's email address
- `bio` - User's biographical information
- `payment_plan_id` - Reference to payment plan
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

#### Organization Attributes
- `org_name` - Unique identifier for the organization
- `description` - Organization description
- `payment_plan_id` - Reference to payment plan
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

#### Repository Attributes
- `owner` - Repository owner (user or organization)
- `repo_name` - Repository name
- `description` - Repository description
- `is_private` - Privacy flag
- `language` - Primary programming language
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

### Entity Transformation Methods

All entities implement the following transformation methods:
- **`fromRequest()`** - Convert API input to entity format
- **`toRecord()`** - Convert to DynamoDB record format
- **`toResponse()`** - Convert to API output format
- **`validate()`** - Input validation and business rules

### Implementation Sequence

1. **DynamoDB table and GSI configuration** - Set up the foundational table structure
2. **DynamoDB-Toolbox schema definitions** - Define the type-safe schemas
3. **Key generation and validation utilities** - Create helper functions for key management
4. **Core entity record definitions** - Implement User, Organization, Repository entities
5. **Repository classes with CRUD operations** - Build the data access layer
6. **Test setup with DynamoDB Local and data factories** - Establish testing infrastructure

## Scope

### Included Features
- DynamoDB table configuration with main table and 4 GSI indexes
- User DynamoDB-Toolbox record definition with ACCOUNT# keys
- Organization DynamoDB-Toolbox record definition with ACCOUNT# keys
- Repository DynamoDB-Toolbox record definition with REPO# keys
- UserRepository class with CRUD operations (create, get, update, delete)
- OrganizationRepository class with CRUD operations
- RepositoryRepository class with CRUD operations
- Key generation utilities for composite keys
- Entity validation and transformation methods
- Jest test setup with DynamoDB Local
- Test data factories for core entities

### Excluded Features
- Issue, PullRequest, Comment entities (Phase 2)
- Reaction system and relationship management
- GitHub App entities and installations
- API endpoints and route handlers
- Service layer business logic
- Complex relationship queries and GSI4 issue patterns

## Dependencies and Alignment

**Dependencies:** None - This is the foundational feature  
**Aligns With:** product_vision

This feature serves as the foundation for all subsequent development and must be completed before any other features can be implemented.