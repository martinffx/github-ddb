# Star Feature - Quick Reference

**Status:** NOT STARTED | **Phase:** 2.5 | **Dependencies:** User, Organization, Repository

## User Story
As a GitHub user, I want to star repositories I'm interested in, so that I can bookmark repos for later reference and show appreciation for projects I find valuable.

## Acceptance Criteria
- ✅ User can star a repository
- ✅ User can unstar a repository
- ✅ List repositories a user has starred (newest first)
- ✅ List users who starred a repository
- ✅ Check if user has starred a repository
- ✅ Prevent duplicate stars (idempotent)

## Business Rules
1. User can star a repo only once (BR-1)
2. Stars must reference valid users and repos (BR-2)
3. Timestamps recorded when stars created (BR-3)
4. Unstarring is idempotent (BR-4)
5. Stars bidirectional queryable (BR-5)

## DynamoDB Design

### Key Pattern (Adjacency List)
**Direction 1 (User → Repos):**
- PK: `ACCOUNT#{username}`
- SK: `STAR#{owner}#{repo}#{timestamp}`

**Direction 2 (Repo → Users via GSI1):**
- GSI1PK: `REPO#{owner}#{repo}`
- GSI1SK: `STAR#{username}#{timestamp}`

### Access Patterns
| Pattern | Type | Index | Key Pattern |
|---------|------|-------|-------------|
| Star repo | PutItem | Main | `ACCOUNT#{user}` / `STAR#{owner}#{repo}#{ts}` |
| Unstar repo | DeleteItem | Main | `ACCOUNT#{user}` / `STAR#{owner}#{repo}#{ts}` |
| User's stars | Query | Main | `ACCOUNT#{user}` / `begins_with(STAR#)` |
| Repo stargazers | Query | GSI1 | `REPO#{owner}#{repo}` / `begins_with(STAR#)` |
| Check starred | Query | Main | `ACCOUNT#{user}` / `begins_with(STAR#{owner}#{repo}#)` |

## Implementation

### Files
1. `/src/repos/schema.ts` - Add StarRecord entity
2. `/src/services/entities/StarEntity.ts` - Entity transformations
3. `/src/repos/StarRepository.ts` - Data access layer
4. `/src/repos/StarRepository.test.ts` - Integration tests

### StarEntity
```typescript
class StarEntity {
  userName: string
  repoOwner: string
  repoName: string
  starredAt: DateTime

  static fromRequest(data)
  static fromRecord(record)
  toRecord(): StarInput
  toResponse(): StarResponse
}
```

### StarRepository Methods
- `create(star)` - Create with validation (user + repo exist)
- `get(userName, owner, name)` - Find specific star
- `delete(userName, owner, name)` - Remove star (idempotent)
- `listByUser(userName, opts)` - User's starred repos (paginated)
- `listByRepo(owner, name, opts)` - Repo stargazers (paginated)
- `isStarred(userName, owner, name)` - Check status

### Key Implementation Notes
- Use **Query with beginsWith** for `get()` since exact timestamp unknown
- Create uses **transaction** to validate user + repo exist
- Duplicate stars return existing (idempotent)
- Sort by timestamp DESC (newest first) with `reverse: true`

## Testing
- Create with valid/invalid user/repo
- Duplicate star handling
- Idempotent unstar
- Pagination in both directions
- Star status checks

## Scope
**Included:** Entity, Repository, bidirectional queries, pagination, referential integrity
**Excluded:** Star counts, activity feed, notifications, bulk operations
