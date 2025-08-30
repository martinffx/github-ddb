# Core Entities - Implementation Spec

## Feature
Setup DynamoDB core entities (User, Organization, Repository) with single table design for GitHub data model foundation.

## Key Acceptance Criteria
- **AC-1:** DynamoDB table with GSI1-GSI4 indexes configured
- **AC-2:** User entity with ACCOUNT#<username> keys and CRUD operations
- **AC-3:** Organization entity with ACCOUNT#<orgname> keys and CRUD operations
- **AC-4:** Repository entity with REPO#<owner>#<reponame> keys and CRUD operations
- **AC-5:** All entities follow single table design patterns

## Table Design
**Main Table:** GitHubTable (PK: String, SK: String)

**GSIs:**
- GSI1 (GSI1PK/GSI1SK): Account queries, PR lists
- GSI2 (GSI2PK/GSI2SK): Repo lookup, forks
- GSI3 (GSI3PK/GSI3SK): Recent repos by account
- GSI4 (GSI4PK/GSI4SK): Repo metadata, issues

## Entity Key Patterns

### User
```
PK/SK: ACCOUNT#<username>
GSI1PK/GSI1SK: ACCOUNT#<username>
GSI3PK/GSI3SK: ACCOUNT#<username>
```

### Organization
```
PK/SK: ACCOUNT#<orgname>
GSI1PK/GSI1SK: ACCOUNT#<orgname>
GSI3PK/GSI3SK: ACCOUNT#<orgname>
```

### Repository
```
PK/SK: REPO#<owner>#<reponame>
GSI1PK/GSI1SK: REPO#<owner>#<reponame>
GSI2PK/GSI2SK: REPO#<owner>#<reponame>
GSI3PK: ACCOUNT#<owner>, GSI3SK: #<updated_at>
```

## Implementation Sequence
1. DynamoDB table and GSI configuration
2. DynamoDB-Toolbox schema definitions
3. Key generation and validation utilities
4. Entity record definitions (User, Organization, Repository)
5. Repository classes with CRUD operations
6. Test setup with DynamoDB Local and data factories

## Core Requirements
- **Entities:** User, Organization, Repository with transformation methods (fromRequest, toRecord, toResponse, validate)
- **Repositories:** CRUD operations for each entity type
- **Keys:** Global uniqueness for accounts, per-owner uniqueness for repos
- **Testing:** Jest setup with DynamoDB Local and data factories

## Scope
**Included:** Core entities, CRUD repositories, table config, tests  
**Excluded:** Issues/PRs, API endpoints, service logic, complex queries