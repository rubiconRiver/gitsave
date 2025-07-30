// API service that abstracts communication with the backend
// Works with both IPC (Electron) and HTTP (development/web)

interface GitStatus {
  branch: string
  branches: string[]
  changes: Array<{
    path: string
    status: 'added' | 'modified' | 'deleted' | 'renamed'
    oldPath?: string
  }>
  isClean: boolean
  ahead: number
  behind: number
}

interface CommitOptions {
  message: string
  files?: string[] // If not provided, commits all staged files
}

class ApiService {
  private isElectronReady = false

  constructor() {
    // Check if running in Electron
    this.isElectronReady = !!window.electron
    
    if (!this.isElectronReady) {
      console.warn('Electron API not available - running in browser mode')
    }
  }

  // Git operations
  async getStatus(): Promise<GitStatus> {
    return this.request('git/status')
  }

  async commit(options: CommitOptions): Promise<void> {
    return this.request('git/commit', 'POST', options)
  }

  async switchBranch(branch: string): Promise<void> {
    return this.request('git/checkout', 'POST', { branch })
  }

  async createBranch(name: string): Promise<void> {
    return this.request('git/branch', 'POST', { name })
  }

  async fetch(): Promise<void> {
    return this.request('git/fetch', 'POST')
  }

  async pull(): Promise<void> {
    return this.request('git/pull', 'POST')
  }

  async push(): Promise<void> {
    return this.request('git/push', 'POST')
  }

  async undo(): Promise<void> {
    return this.request('git/undo', 'POST')
  }

  // Intents operations
  async getIntents(): Promise<any[]> {
    return this.request('intents')
  }

  async createIntent(data: any): Promise<any> {
    return this.request('intents', 'POST', data)
  }

  async updateIntent(id: string, data: any): Promise<any> {
    return this.request(`intents/${id}`, 'PATCH', data)
  }

  async deleteIntent(id: string): Promise<void> {
    return this.request(`intents/${id}`, 'DELETE')
  }

  // Utility operations
  async openInEditor(): Promise<void> {
    return this.request('utils/open-editor', 'POST')
  }

  async openInFinder(): Promise<void> {
    return this.request('utils/open-finder', 'POST')
  }

  async openTerminal(): Promise<void> {
    return this.request('utils/open-terminal', 'POST')
  }

  async openGitHub(): Promise<void> {
    return this.request('utils/open-github', 'POST')
  }

  // Private request method using IPC
  private async request(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<any> {
    if (!this.isElectronReady) {
      // Return mock data for development
      console.warn(`Mock API call: ${method} ${endpoint}`, data)
      
      // Mock responses for development
      if (endpoint === 'git/status') {
        return {
          branch: 'main',
          branches: ['main', 'develop'],
          changes: [
            { path: 'src/App.tsx', status: 'modified' },
            { path: 'src/components/Widget.tsx', status: 'added' }
          ],
          isClean: false,
          ahead: 0,
          behind: 0
        }
      }
      
      return null
    }
    
    try {
      const result = await window.electron!.invoke('api-request', {
        endpoint,
        method,
        data
      })
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      return result.data
    } catch (error) {
      console.error('IPC request failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const api = new ApiService()