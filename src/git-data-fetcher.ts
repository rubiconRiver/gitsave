import simpleGit, { SimpleGit } from 'simple-git';

// Constants
const DEFAULT_COMMIT_LIMIT = 500;
const DEFAULT_GRAPH_LIMIT = 100;

export interface CommitInfo {
  hash: string;
  parents: string[];
  author_name: string;
  author_email: string;
  date: string;
  message: string;
}

export interface BranchInfo {
  name: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    email: string;
    date: string;
  } | null;
}

export interface GitGraphData {
  currentBranch: string;
  branches: string[];
  branchDetails: BranchInfo[];
  allCommits: CommitInfo[];
  branchCommitMap: Map<string, string>;
  rawGraph: string;
  repoPath: string;
}

export class GitDataFetcher {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async fetchComprehensiveData(): Promise<GitGraphData> {
    // Get local branches
    const branches = await this.git.branchLocal();
    
    // Get comprehensive commit history from all branches with parent info
    const allCommits = await this.fetchAllCommits();
    
    // Get branch references
    const branchCommitMap = await this.fetchBranchReferences();
    
    // Get branch details with last commit info
    const branchDetails = await this.fetchBranchDetails(branches.all);
    
    // Get raw graph output for ASCII visualization
    const rawGraph = await this.git.raw([
      'log', 
      '--graph', 
      '--oneline', 
      '--all', 
      `-n`, 
      `${DEFAULT_GRAPH_LIMIT}`
    ]);
    
    return {
      currentBranch: branches.current,
      branches: branches.all,
      branchDetails,
      allCommits,
      branchCommitMap,
      rawGraph,
      repoPath: this.repoPath
    };
  }

  private async fetchAllCommits(limit: number = DEFAULT_COMMIT_LIMIT): Promise<CommitInfo[]> {
    // Using pretty format to get structured data including parents
    const allCommitsRaw = await this.git.raw([
      'log', 
      '--all',
      '--pretty=format:%H|%P|%an|%ae|%at|%s',
      '-n', 
      `${limit}`
    ]);
    
    // Parse the raw commit data
    return allCommitsRaw
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, parents, author, email, timestamp, ...messageParts] = line.split('|');
        return {
          hash,
          parents: parents ? parents.split(' ') : [],
          author_name: author,
          author_email: email,
          date: new Date(parseInt(timestamp) * 1000).toISOString(),
          message: messageParts.join('|')
        };
      });
  }

  private async fetchBranchReferences(): Promise<Map<string, string>> {
    const branchRefs = await this.git.raw(['show-ref', '--heads']);
    const branchCommitMap = new Map<string, string>();
    
    branchRefs
      .split('\n')
      .filter(line => line.trim())
      .forEach(line => {
        const [hash, ref] = line.split(' ');
        const branchName = ref.replace('refs/heads/', '');
        branchCommitMap.set(branchName, hash);
      });
    
    return branchCommitMap;
  }

  private async fetchBranchDetails(branchNames: string[]): Promise<BranchInfo[]> {
    const branchDetails: BranchInfo[] = [];
    
    for (const branch of branchNames) {
      try {
        const branchLog = await this.git.log([branch, '-n', '1']);
        const lastCommit = branchLog.latest;
        branchDetails.push({
          name: branch,
          lastCommit: lastCommit ? {
            hash: lastCommit.hash,
            message: lastCommit.message,
            author: lastCommit.author_name,
            email: lastCommit.author_email,
            date: lastCommit.date
          } : null
        });
      } catch (err) {
        console.error(`Failed to get details for branch ${branch}:`, err);
        branchDetails.push({
          name: branch,
          lastCommit: null
        });
      }
    }
    
    return branchDetails;
  }

  async fetchUpdatedCommits(since: string): Promise<CommitInfo[]> {
    // Fetch commits since a specific date/hash
    const newCommitsRaw = await this.git.raw([
      'log', 
      '--all',
      '--pretty=format:%H|%P|%an|%ae|%at|%s',
      `--since="${since}"`
    ]);
    
    return newCommitsRaw
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, parents, author, email, timestamp, ...messageParts] = line.split('|');
        return {
          hash,
          parents: parents ? parents.split(' ') : [],
          author_name: author,
          author_email: email,
          date: new Date(parseInt(timestamp) * 1000).toISOString(),
          message: messageParts.join('|')
        };
      });
  }
}