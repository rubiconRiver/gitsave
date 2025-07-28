import simpleGit, { SimpleGit } from 'simple-git';

// Constants
const DEFAULT_COMMIT_LIMIT = 10000;  // Get much more history
const DEFAULT_GRAPH_LIMIT = 1000;    // Show more in ASCII graph too

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
  private filterWipCommits: boolean;

  constructor(repoPath: string, filterWipCommits: boolean = true) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
    this.filterWipCommits = filterWipCommits;
  }

  private isWipCommit(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    return lowerMessage === 'wip' || 
           lowerMessage === 'save' || 
           lowerMessage === 'saving' ||
           lowerMessage === 'snapshot' ||
           lowerMessage.startsWith('wip:') ||
           lowerMessage.startsWith('save:') ||
           lowerMessage.startsWith('snapshot:');
  }

  async fetchComprehensiveData(): Promise<GitGraphData> {
    // Get local branches
    const branches = await this.git.branchLocal();
    
    // Get comprehensive commit history from all branches with parent info
    let allCommits = await this.fetchAllCommits();
    
    // Get branch references
    const branchCommitMap = await this.fetchBranchReferences();
    
    // Get branch details with last commit info
    const branchDetails = await this.fetchBranchDetails(branches.all);
    
    // Filter out WIP commits if enabled, but keep branch tips
    if (this.filterWipCommits) {
      const branchTipHashes = new Set(Array.from(branchCommitMap.values()));
      const filteredCommits: CommitInfo[] = [];
      const wipCommitHashes = new Set<string>();
      
      // First pass: identify all WIP commits
      for (const commit of allCommits) {
        if (this.isWipCommit(commit.message)) {
          wipCommitHashes.add(commit.hash);
        }
      }
      
      // Build a map for finding replacement parents
      const parentMap = new Map<string, string[]>();
      for (const commit of allCommits) {
        parentMap.set(commit.hash, commit.parents);
      }
      
      // Function to find non-WIP ancestors
      const findNonWipAncestors = (hash: string, visited = new Set<string>()): string[] => {
        if (visited.has(hash)) return [];
        visited.add(hash);
        
        if (!wipCommitHashes.has(hash) || branchTipHashes.has(hash)) {
          return [hash];
        }
        
        const parents = parentMap.get(hash) || [];
        const ancestors: string[] = [];
        for (const parent of parents) {
          ancestors.push(...findNonWipAncestors(parent, visited));
        }
        return ancestors;
      };
      
      // Second pass: keep non-WIP commits and WIP commits that are branch tips
      for (const commit of allCommits) {
        if (!wipCommitHashes.has(commit.hash) || branchTipHashes.has(commit.hash)) {
          // Find proper parent connections, skipping over filtered WIP commits
          const reconnectedParents: string[] = [];
          for (const parent of commit.parents) {
            if (!wipCommitHashes.has(parent) || branchTipHashes.has(parent)) {
              reconnectedParents.push(parent);
            } else {
              // Find non-WIP ancestors to connect to
              reconnectedParents.push(...findNonWipAncestors(parent));
            }
          }
          
          filteredCommits.push({
            ...commit,
            parents: [...new Set(reconnectedParents)] // Remove duplicates
          });
        }
      }
      
      allCommits = filteredCommits;
    }
    
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