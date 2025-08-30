# Content Entities Design

## 1. Feature Overview

The Content Entities feature represents **Phase 2** of the GitHub DynamoDB implementation, building upon the core-entities foundation (User, Repository, Organization). This phase introduces the primary content layer that enables GitHub's core functionality through 7 specialized entities:

- **Issues & Pull Requests**: Sequential numbering with status tracking
- **Comments**: Thread-based discussions for Issues and PRs  
- **Reactions**: Polymorphic emoji responses to any content type
- **Forks & Stars**: Repository relationship management

This content layer implements advanced DynamoDB patterns including sequential numbering with atomic counters, polymorphic targeting, adjacency lists, and many-to-many relationships while maintaining single-table design efficiency.

## 2. Architecture

### Component Relationships

```
Content Entities Layer (Phase 2)
├── Sequential Content
│   ├── Issue (GSI4 for status queries)
│   └── Pull Request (GSI1 for repo listing)
├── Discussion Layer  
│   ├── Issue Comment (item collections)
│   └── PR Comment (item collections)
├── Interaction Layer
│   └── Reaction (polymorphic targeting)
└── Relationship Layer
    ├── Fork (adjacency lists via GSI2)
    └── Star (many-to-many)

Dependencies: Core Entities (User, Repository, Organization)
```

### Data Flow

1. **Sequential Numbering**: Issues and PRs share atomic counters per repository
2. **Content Hierarchy**: Repository → Issue/PR → Comments → Reactions  
3. **Cross-Entity Validation**: All entities validate against core User/Repository
4. **GSI Optimization**: Status queries (GSI4), repository listing (GSI1), fork trees (GSI2)

## 3. Domain Model

### Issue Entity

The Issue entity uses sequential numbering and GSI4 for efficient status-based queries with reverse numbering for open issues.

```typescript
// DynamoDB-Toolbox Schema
const IssueRecord = Entity.build({
  name: 'Issue',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    GSI4PK: { type: 'string', key: true },
    GSI4SK: { type: 'string', key: true },
    issue_number: { type: 'number', required: true },
    title: { type: 'string', required: true },
    body: { type: 'string', required: false },
    status: { type: 'string', required: true, default: 'open' },
    author: { type: 'string', required: true },
    assignees: { type: 'list', required: false },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() },
    updated_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Key Generation
PK: "REPO#{owner}#{repo_name}"
SK: "ISSUE#{zero_padded_number}"
GSI4PK: "REPO#{owner}#{repo_name}"
GSI4SK: "ISSUE#OPEN#{999999_minus_number}" | "#ISSUE#CLOSED#{zero_padded_number}"
```

### Pull Request Entity

Pull Requests use sequential numbering shared with Issues and GSI1 for repository-based queries.

```typescript
const PullRequestRecord = Entity.build({
  name: 'PullRequest',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    GSI1PK: { type: 'string', key: true },
    GSI1SK: { type: 'string', key: true },
    pr_number: { type: 'number', required: true },
    title: { type: 'string', required: true },
    body: { type: 'string', required: false },
    status: { type: 'string', required: true, default: 'open' },
    author: { type: 'string', required: true },
    source_branch: { type: 'string', required: true },
    target_branch: { type: 'string', required: true, default: 'main' },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() },
    updated_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Key Generation
PK: "PR#{owner}#{repo_name}#{zero_padded_number}"
SK: "PR#{owner}#{repo_name}#{zero_padded_number}"
GSI1PK: "PR#{owner}#{repo_name}"
GSI1SK: "PR#{zero_padded_number}"
```

### Issue Comment Entity

Comments use item collections for efficient parent-based queries without requiring GSI allocation.

```typescript
const IssueCommentRecord = Entity.build({
  name: 'IssueComment',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    comment_id: { type: 'string', required: true },
    issue_number: { type: 'number', required: true },
    content: { type: 'string', required: true },
    author: { type: 'string', required: true },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() },
    updated_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Key Generation (Item Collection)
PK: "ISSUECOMMENT#{owner}#{repo_name}#{issue_number}"
SK: "ISSUECOMMENT#{comment_id}"
```

### PR Comment Entity

PR Comments follow the same item collection pattern as Issue Comments.

```typescript
const PRCommentRecord = Entity.build({
  name: 'PRComment',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    comment_id: { type: 'string', required: true },
    pr_number: { type: 'number', required: true },
    content: { type: 'string', required: true },
    author: { type: 'string', required: true },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() },
    updated_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Key Generation (Item Collection)
PK: "PRCOMMENT#{owner}#{repo_name}#{pr_number}"
SK: "PRCOMMENT#{comment_id}"
```

### Reaction Entity

Reactions implement polymorphic targeting with composite keys ensuring uniqueness per user per target.

```typescript
const ReactionRecord = Entity.build({
  name: 'Reaction',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    target_type: { type: 'string', required: true }, // ISSUE, PR, ISSUECOMMENT, PRCOMMENT
    target_id: { type: 'string', required: true },
    reaction_type: { type: 'string', required: true }, // +1, -1, laugh, hooray, confused, heart, rocket, eyes
    username: { type: 'string', required: true },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Polymorphic Key Generation
PK: "{target_type}REACTION#{owner}#{repo_name}#{target_id}#{username}"
SK: "{target_type}REACTION#{owner}#{repo_name}#{target_id}#{username}"
```

### Fork Entity

Forks implement adjacency lists using GSI2 for efficient fork tree traversal.

```typescript
const ForkRecord = Entity.build({
  name: 'Fork',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    GSI2PK: { type: 'string', key: true },
    GSI2SK: { type: 'string', key: true },
    original_owner: { type: 'string', required: true },
    original_repo: { type: 'string', required: true },
    fork_owner: { type: 'string', required: true },
    fork_repo: { type: 'string', required: true },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Adjacency List Key Generation
PK: "REPO#{original_owner}#{original_repo}"
SK: "FORK#{fork_owner}"
GSI2PK: "REPO#{original_owner}#{original_repo}"
GSI2SK: "FORK#{fork_owner}"
```

### Star Entity

Stars implement many-to-many relationships between users and repositories.

```typescript
const StarRecord = Entity.build({
  name: 'Star',
  table,
  attributes: {
    PK: { type: 'string', key: true, partitionKey: true },
    SK: { type: 'string', key: true, sortKey: true },
    username: { type: 'string', required: true },
    repo_owner: { type: 'string', required: true },
    repo_name: { type: 'string', required: true },
    created_at: { type: 'string', required: true, default: () => new Date().toISOString() }
  }
});

// Many-to-Many Key Generation
PK: "ACCOUNT#{username}"
SK: "STAR#{owner}#{repo_name}"
```

## 4. Sequential Numbering Design

### Atomic Counter Implementation

Sequential numbering for Issues and Pull Requests uses atomic DynamoDB counters with race condition handling:

```typescript
class SequentialNumberGenerator {
  async getNextNumber(owner: string, repoName: string): Promise<number> {
    const counterKey = `COUNTER#${owner}#${repoName}`;
    
    try {
      // Atomic increment using UpdateItem with ADD
      const result = await ddbClient.updateItem({
        TableName: 'GitHubTable',
        Key: { PK: counterKey, SK: counterKey },
        UpdateExpression: 'ADD #counter :increment',
        ExpressionAttributeNames: { '#counter': 'counter' },
        ExpressionAttributeValues: { ':increment': 1 },
        ReturnValues: 'UPDATED_NEW'
      });
      
      return result.Attributes.counter;
    } catch (error) {
      if (error.code === 'ValidationException') {
        // Initialize counter on first use
        await this.initializeCounter(owner, repoName);
        return this.getNextNumber(owner, repoName);
      }
      throw error;
    }
  }
  
  private async initializeCounter(owner: string, repoName: string): Promise<void> {
    const counterKey = `COUNTER#${owner}#${repoName}`;
    
    await ddbClient.putItem({
      TableName: 'GitHubTable',
      Key: { PK: counterKey, SK: counterKey },
      Item: { counter: 0 },
      ConditionExpression: 'attribute_not_exists(PK)'
    });
  }
}
```

### GSI4 Reverse Numbering Strategy

Open issues use reverse numbering (999999 - issue_number) in GSI4SK to maintain newest-first ordering:

```typescript
function generateGSI4Keys(issueNumber: number, status: string) {
  const paddedNumber = issueNumber.toString().padStart(6, '0');
  
  if (status === 'open') {
    const reverseNumber = (999999 - issueNumber).toString().padStart(6, '0');
    return {
      GSI4PK: `REPO#${owner}#${repoName}`,
      GSI4SK: `ISSUE#OPEN#${reverseNumber}`
    };
  } else {
    return {
      GSI4PK: `REPO#${owner}#${repoName}`,
      GSI4SK: `#ISSUE#CLOSED#${paddedNumber}`
    };
  }
}
```

## 5. Database Design

### Table Structure

All content entities share the single `GitHubTable` with the following key structure:

| Entity | PK Pattern | SK Pattern | GSI Usage |
|--------|------------|------------|-----------|
| Issue | `REPO#{owner}#{repo}` | `ISSUE#{number}` | GSI4 (status) |
| Pull Request | `PR#{owner}#{repo}#{number}` | `PR#{owner}#{repo}#{number}` | GSI1 (repo listing) |
| Issue Comment | `ISSUECOMMENT#{owner}#{repo}#{issue}` | `ISSUECOMMENT#{id}` | None (item collection) |
| PR Comment | `PRCOMMENT#{owner}#{repo}#{pr}` | `PRCOMMENT#{id}` | None (item collection) |
| Reaction | `{type}REACTION#{owner}#{repo}#{target}#{user}` | `{type}REACTION#{owner}#{repo}#{target}#{user}` | None |
| Fork | `REPO#{original_owner}#{original_repo}` | `FORK#{fork_owner}` | GSI2 (adjacency) |
| Star | `ACCOUNT#{username}` | `STAR#{owner}#{repo}` | None |

### GSI Configuration

```typescript
const GSIConfig = {
  GSI1: {
    partitionKey: 'GSI1PK',
    sortKey: 'GSI1SK',
    projectionType: 'ALL',
    purpose: 'Pull Request repository listing'
  },
  GSI2: {
    partitionKey: 'GSI2PK', 
    sortKey: 'GSI2SK',
    projectionType: 'ALL',
    purpose: 'Fork adjacency list queries'
  },
  GSI4: {
    partitionKey: 'GSI4PK',
    sortKey: 'GSI4SK', 
    projectionType: 'ALL',
    purpose: 'Issue status queries (open/closed with reverse numbering)'
  }
};
```

### Access Patterns

| Pattern | Method | Key Structure | Example Query |
|---------|--------|---------------|---------------|
| Get Issue | Query | PK: `REPO#owner#repo`, SK: `ISSUE#000001` | Single item retrieval |
| List Issues by Repo | Query | PK: `REPO#owner#repo`, SK: `begins_with(ISSUE#)` | Repository issue listing |
| List Open Issues | GSI4 Query | GSI4PK: `REPO#owner#repo`, GSI4SK: `begins_with(ISSUE#OPEN#)` | Status-based queries |
| List Closed Issues | GSI4 Query | GSI4PK: `REPO#owner#repo`, GSI4SK: `begins_with(#ISSUE#CLOSED#)` | Historical issues |
| List PRs by Repo | GSI1 Query | GSI1PK: `PR#owner#repo`, sort by GSI1SK | Repository PR listing |
| List Issue Comments | Query | PK: `ISSUECOMMENT#owner#repo#123` | Item collection retrieval |
| List PR Comments | Query | PK: `PRCOMMENT#owner#repo#456` | Item collection retrieval |
| List Repository Forks | GSI2 Query | GSI2PK: `REPO#owner#repo`, GSI2SK: `begins_with(FORK#)` | Adjacency list traversal |
| List User Stars | Query | PK: `ACCOUNT#username`, SK: `begins_with(STAR#)` | User's starred repos |

## 6. Repository Layer

### Issue Repository

```typescript
class IssueRepository {
  async create(issue: IssueRequest): Promise<IssueResponse> {
    // Generate sequential number
    const issueNumber = await this.numberGenerator.getNextNumber(
      issue.owner, 
      issue.repoName
    );
    
    // Create issue record with GSI4 keys
    const record = IssueRecord.fromRequest({
      ...issue,
      issue_number: issueNumber,
      PK: `REPO#${issue.owner}#${issue.repoName}`,
      SK: `ISSUE#${issueNumber.toString().padStart(6, '0')}`,
      ...this.generateGSI4Keys(issueNumber, issue.status || 'open')
    });
    
    await IssueRecord.put(record);
    return record.toResponse();
  }
  
  async listOpenByRepo(owner: string, repoName: string): Promise<IssueResponse[]> {
    const result = await IssueRecord.query(
      'GSI4PK = :pk AND begins_with(GSI4SK, :sk)',
      {
        ':pk': `REPO#${owner}#${repoName}`,
        ':sk': 'ISSUE#OPEN#'
      },
      { index: 'GSI4' }
    );
    return result.Items.map(item => item.toResponse());
  }
  
  async updateStatus(owner: string, repoName: string, number: number, status: string): Promise<void> {
    // Update both main record and GSI4 keys for status change
    const paddedNumber = number.toString().padStart(6, '0');
    const gsi4Keys = this.generateGSI4Keys(number, status);
    
    await IssueRecord.update(
      { PK: `REPO#${owner}#${repoName}`, SK: `ISSUE#${paddedNumber}` },
      { 
        status,
        updated_at: new Date().toISOString(),
        ...gsi4Keys
      }
    );
  }
}
```

### Pull Request Repository

```typescript
class PullRequestRepository {
  async create(pr: PullRequestRequest): Promise<PullRequestResponse> {
    const prNumber = await this.numberGenerator.getNextNumber(pr.owner, pr.repoName);
    const paddedNumber = prNumber.toString().padStart(6, '0');
    
    const record = PullRequestRecord.fromRequest({
      ...pr,
      pr_number: prNumber,
      PK: `PR#${pr.owner}#${pr.repoName}#${paddedNumber}`,
      SK: `PR#${pr.owner}#${pr.repoName}#${paddedNumber}`,
      GSI1PK: `PR#${pr.owner}#${pr.repoName}`,
      GSI1SK: `PR#${paddedNumber}`
    });
    
    await PullRequestRecord.put(record);
    return record.toResponse();
  }
  
  async listByRepo(owner: string, repoName: string): Promise<PullRequestResponse[]> {
    const result = await PullRequestRecord.query(
      'GSI1PK = :pk',
      { ':pk': `PR#${owner}#${repoName}` },
      { index: 'GSI1', sortDirection: 'desc' }
    );
    return result.Items.map(item => item.toResponse());
  }
}
```

### Comment Repository (Issue/PR)

```typescript
class IssueCommentRepository {
  async create(comment: IssueCommentRequest): Promise<IssueCommentResponse> {
    const commentId = this.idGenerator.generate(); // UUID or ULID
    
    const record = IssueCommentRecord.fromRequest({
      ...comment,
      comment_id: commentId,
      PK: `ISSUECOMMENT#${comment.owner}#${comment.repoName}#${comment.issueNumber}`,
      SK: `ISSUECOMMENT#${commentId}`
    });
    
    await IssueCommentRecord.put(record);
    return record.toResponse();
  }
  
  async listByIssue(owner: string, repoName: string, issueNumber: number): Promise<IssueCommentResponse[]> {
    const result = await IssueCommentRecord.query(
      'PK = :pk',
      { ':pk': `ISSUECOMMENT#${owner}#${repoName}#${issueNumber}` },
      { sortDirection: 'asc' } // Chronological order
    );
    return result.Items.map(item => item.toResponse());
  }
}
```

### Reaction Repository

```typescript
class ReactionRepository {
  async create(reaction: ReactionRequest): Promise<ReactionResponse> {
    const compositeKey = `${reaction.targetType}REACTION#${reaction.owner}#${reaction.repoName}#${reaction.targetId}#${reaction.username}`;
    
    const record = ReactionRecord.fromRequest({
      ...reaction,
      PK: compositeKey,
      SK: compositeKey
    });
    
    // Use condition to prevent duplicate reactions
    await ReactionRecord.put(record, {
      ConditionExpression: 'attribute_not_exists(PK)'
    });
    
    return record.toResponse();
  }
  
  async listByTarget(targetType: string, owner: string, repoName: string, targetId: string): Promise<ReactionResponse[]> {
    const result = await ReactionRecord.query(
      'begins_with(PK, :pk)',
      { ':pk': `${targetType}REACTION#${owner}#${repoName}#${targetId}#` }
    );
    return result.Items.map(item => item.toResponse());
  }
}
```

## 7. Polymorphic Reaction System

### Flexible Targeting Design

The reaction system supports multiple target types using composite keys:

```typescript
interface ReactionTarget {
  ISSUE: string;        // Issue number
  PR: string;           // PR number  
  ISSUECOMMENT: string; // Comment ID
  PRCOMMENT: string;    // Comment ID
}

class ReactionTargetResolver {
  static resolveTargetKey(targetType: keyof ReactionTarget, owner: string, repoName: string, targetId: string): string {
    return `${targetType}REACTION#${owner}#${repoName}#${targetId}`;
  }
  
  static validateTarget(targetType: keyof ReactionTarget, targetId: string): boolean {
    switch (targetType) {
      case 'ISSUE':
      case 'PR':
        return /^\d+$/.test(targetId); // Numeric issue/PR number
      case 'ISSUECOMMENT':
      case 'PRCOMMENT':
        return /^[a-f0-9-]{36}$/i.test(targetId); // UUID format
      default:
        return false;
    }
  }
}
```

### Reaction Aggregation

```typescript
class ReactionAggregator {
  async getReactionSummary(targetType: string, owner: string, repoName: string, targetId: string): Promise<ReactionSummary> {
    const reactions = await this.reactionRepository.listByTarget(targetType, owner, repoName, targetId);
    
    const summary: ReactionSummary = {
      '+1': 0, '-1': 0, 'laugh': 0, 'hooray': 0, 
      'confused': 0, 'heart': 0, 'rocket': 0, 'eyes': 0
    };
    
    reactions.forEach(reaction => {
      summary[reaction.reaction_type] = (summary[reaction.reaction_type] || 0) + 1;
    });
    
    return summary;
  }
}
```

## 8. Relationship Management

### Fork Adjacency Lists

Forks use adjacency list patterns in GSI2 for efficient fork tree navigation:

```typescript
class ForkRepository {
  async create(fork: ForkRequest): Promise<ForkResponse> {
    const record = ForkRecord.fromRequest({
      ...fork,
      PK: `REPO#${fork.originalOwner}#${fork.originalRepo}`,
      SK: `FORK#${fork.forkOwner}`,
      GSI2PK: `REPO#${fork.originalOwner}#${fork.originalRepo}`,
      GSI2SK: `FORK#${fork.forkOwner}`
    });
    
    await ForkRecord.put(record);
    return record.toResponse();
  }
  
  async listForksOfRepo(owner: string, repoName: string): Promise<ForkResponse[]> {
    const result = await ForkRecord.query(
      'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      {
        ':pk': `REPO#${owner}#${repoName}`,
        ':sk': 'FORK#'
      },
      { index: 'GSI2' }
    );
    return result.Items.map(item => item.toResponse());
  }
  
  async getForkTree(owner: string, repoName: string): Promise<ForkTree> {
    // Recursive fork tree construction
    const directForks = await this.listForksOfRepo(owner, repoName);
    const tree: ForkTree = { 
      repo: `${owner}/${repoName}`,
      forks: []
    };
    
    for (const fork of directForks) {
      const subTree = await this.getForkTree(fork.fork_owner, fork.fork_repo);
      tree.forks.push(subTree);
    }
    
    return tree;
  }
}
```

### Star Many-to-Many Pattern

Stars implement bidirectional many-to-many relationships:

```typescript
class StarRepository {
  async create(star: StarRequest): Promise<StarResponse> {
    const record = StarRecord.fromRequest({
      ...star,
      PK: `ACCOUNT#${star.username}`,
      SK: `STAR#${star.repoOwner}#${star.repoName}`
    });
    
    await StarRecord.put(record);
    return record.toResponse();
  }
  
  async listStarsByUser(username: string): Promise<StarResponse[]> {
    const result = await StarRecord.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': `ACCOUNT#${username}`,
        ':sk': 'STAR#'
      }
    );
    return result.Items.map(item => item.toResponse());
  }
  
  async listStargazersByRepo(owner: string, repoName: string): Promise<string[]> {
    // Requires GSI or scan - consider adding GSI3 for reverse lookup if needed
    const result = await StarRecord.scan({
      FilterExpression: 'repo_owner = :owner AND repo_name = :repo',
      ExpressionAttributeValues: {
        ':owner': owner,
        ':repo': repoName
      }
    });
    return result.Items.map(item => item.username);
  }
  
  async isStarred(username: string, owner: string, repoName: string): Promise<boolean> {
    try {
      await StarRecord.get({
        PK: `ACCOUNT#${username}`,
        SK: `STAR#${owner}#${repoName}`
      });
      return true;
    } catch (error) {
      if (error.code === 'ItemNotFound') return false;
      throw error;
    }
  }
}
```

## 9. Testing Strategy

### Integration Testing with Core Entities

Content entities require comprehensive integration testing with the core entities foundation:

```typescript
describe('Content Entities Integration', () => {
  beforeEach(async () => {
    // Initialize DynamoDB Local with core entities
    await setupDynamoDBLocal();
    await createCoreEntitiesFixtures();
  });
  
  describe('Issue Sequential Numbering', () => {
    it('should generate sequential numbers shared between issues and PRs', async () => {
      const repo = await createRepository('owner', 'repo');
      
      const issue1 = await issueRepository.create({
        owner: 'owner',
        repoName: 'repo',
        title: 'First Issue',
        author: 'user1'
      });
      
      const pr1 = await pullRequestRepository.create({
        owner: 'owner', 
        repoName: 'repo',
        title: 'First PR',
        author: 'user1',
        sourceBranch: 'feature',
        targetBranch: 'main'
      });
      
      expect(issue1.issue_number).toBe(1);
      expect(pr1.pr_number).toBe(2);
    });
    
    it('should handle concurrent sequential number generation', async () => {
      const promises = Array(10).fill(0).map((_, i) => 
        issueRepository.create({
          owner: 'owner',
          repoName: 'repo', 
          title: `Issue ${i}`,
          author: 'user1'
        })
      );
      
      const issues = await Promise.all(promises);
      const numbers = issues.map(issue => issue.issue_number).sort();
      
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
  
  describe('GSI4 Status Queries', () => {
    it('should list open issues in reverse chronological order', async () => {
      // Create multiple issues
      await Promise.all([
        issueRepository.create({ title: 'Issue 1', status: 'open' }),
        issueRepository.create({ title: 'Issue 2', status: 'open' }),
        issueRepository.create({ title: 'Issue 3', status: 'closed' })
      ]);
      
      const openIssues = await issueRepository.listOpenByRepo('owner', 'repo');
      
      expect(openIssues).toHaveLength(2);
      expect(openIssues[0].title).toBe('Issue 2'); // Most recent first
      expect(openIssues[1].title).toBe('Issue 1');
    });
  });
  
  describe('Cross-Entity Validation', () => {
    it('should validate user existence when creating issues', async () => {
      await expect(issueRepository.create({
        owner: 'owner',
        repoName: 'repo',
        title: 'Test Issue',
        author: 'nonexistent_user'
      })).rejects.toThrow('User does not exist');
    });
    
    it('should validate repository existence when creating content', async () => {
      await expect(issueRepository.create({
        owner: 'nonexistent_owner',
        repoName: 'repo',
        title: 'Test Issue',
        author: 'user1'
      })).rejects.toThrow('Repository does not exist');
    });
  });
});
```

### Content Entity Factories

```typescript
class ContentEntityFactories {
  static createIssue(overrides: Partial<IssueRequest> = {}): IssueRequest {
    return {
      owner: 'testowner',
      repoName: 'testrepo',
      title: 'Test Issue',
      body: 'Test issue body',
      status: 'open',
      author: 'testuser',
      assignees: [],
      ...overrides
    };
  }
  
  static createPullRequest(overrides: Partial<PullRequestRequest> = {}): PullRequestRequest {
    return {
      owner: 'testowner',
      repoName: 'testrepo', 
      title: 'Test PR',
      body: 'Test PR body',
      status: 'open',
      author: 'testuser',
      sourceBranch: 'feature-branch',
      targetBranch: 'main',
      ...overrides
    };
  }
  
  static createReaction(overrides: Partial<ReactionRequest> = {}): ReactionRequest {
    return {
      targetType: 'ISSUE',
      owner: 'testowner',
      repoName: 'testrepo',
      targetId: '1',
      reactionType: '+1',
      username: 'testuser',
      ...overrides
    };
  }
}
```

## 10. Dependencies

### Core Entities Foundation Requirements

Content entities have strict dependencies on the core entities layer:

```typescript
// Required Core Entity Repositories
interface CoreEntityDependencies {
  userRepository: UserRepository;
  repositoryRepository: RepositoryRepository;
  organizationRepository: OrganizationRepository;
}

// Cross-Entity Validation
class ContentEntityValidator {
  constructor(private coreEntities: CoreEntityDependencies) {}
  
  async validateUser(username: string): Promise<void> {
    const user = await this.coreEntities.userRepository.get(username);
    if (!user) throw new Error(`User ${username} does not exist`);
  }
  
  async validateRepository(owner: string, repoName: string): Promise<void> {
    const repo = await this.coreEntities.repositoryRepository.get(owner, repoName);
    if (!repo) throw new Error(`Repository ${owner}/${repoName} does not exist`);
  }
  
  async validateRepositoryAccess(username: string, owner: string, repoName: string): Promise<void> {
    await this.validateUser(username);
    await this.validateRepository(owner, repoName);
    
    // Additional access control validation
    const hasAccess = await this.coreEntities.repositoryRepository.hasAccess(username, owner, repoName);
    if (!hasAccess) throw new Error(`User ${username} does not have access to ${owner}/${repoName}`);
  }
}
```

### Shared Utility Dependencies

```typescript
// Sequential Number Generation
interface SequentialNumberGenerator {
  getNextNumber(owner: string, repoName: string): Promise<number>;
}

// Comment ID Generation  
interface CommentIdGenerator {
  generate(): string; // UUID v4 or ULID
}

// Key Generation Utilities
interface KeyGeneratorUtilities {
  padNumber(number: number, width: number): string;
  generateGSI4Keys(issueNumber: number, status: string): GSI4Keys;
  generateCompositeKey(...parts: string[]): string;
}
```

## 11. Implementation Notes

### Cross-Entity Validation Strategy

All content entity operations must validate against core entities:

1. **Pre-Creation Validation**: Validate user and repository existence
2. **Access Control**: Check user permissions for repository operations
3. **Data Consistency**: Ensure referential integrity across entities
4. **Error Handling**: Provide clear error messages for validation failures

### GSI Optimization

- **GSI1**: Optimized for PR repository queries with natural sorting
- **GSI2**: Enables efficient fork tree traversal and adjacency operations  
- **GSI4**: Handles issue status queries with reverse numbering for open issues

### Error Handling Patterns

```typescript
class ContentEntityError extends Error {
  constructor(
    message: string,
    public code: string,
    public entityType: string,
    public operation: string
  ) {
    super(message);
  }
}

// Usage examples
throw new ContentEntityError(
  'Sequential number generation failed due to race condition',
  'SEQUENTIAL_NUMBER_CONFLICT',
  'Issue',
  'create'
);

throw new ContentEntityError(
  'Cannot react to non-existent issue',
  'TARGET_NOT_FOUND',
  'Reaction',
  'create'
);
```

### Performance Considerations

1. **Sequential Numbering**: Use exponential backoff for counter conflicts
2. **Item Collections**: Limit comment queries with pagination
3. **GSI Usage**: Prefer GSI queries over table scans for status/repository filtering
4. **Polymorphic Reactions**: Index reaction targets for efficient aggregation
5. **Fork Trees**: Implement depth limits to prevent infinite recursion

This design provides a comprehensive foundation for GitHub's content layer while maintaining single-table DynamoDB efficiency and supporting complex relationship patterns through strategic GSI usage and atomic operations.