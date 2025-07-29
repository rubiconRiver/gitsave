import * as path from 'path';
import * as fs from 'fs/promises';

export class FileService {
  async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async writeJsonFile(filePath: string, data: any): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async copyFile(source: string, dest: string): Promise<void> {
    await fs.copyFile(source, dest);
  }

  async chmod(filePath: string, mode: string): Promise<void> {
    await fs.chmod(filePath, mode);
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content);
  }

  async readdir(dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath);
  }

  async ensureGitignoreEntry(repoPath: string, entry: string = '.intentional.dev/'): Promise<void> {
    try {
      const gitignorePath = path.join(repoPath, '.gitignore');
      
      let content = '';
      let exists = false;
      
      try {
        content = await this.readFile(gitignorePath);
        exists = true;
      } catch (error) {
        // File doesn't exist, we'll create it
      }
      
      const lines = content.split('\n');
      const hasEntry = lines.some(line => 
        line.trim() === entry || 
        line.trim() === '.intentional.dev' ||
        line.trim() === '/.intentional.dev/'
      );
      
      if (!hasEntry) {
        const newContent = content + (content && !content.endsWith('\n') ? '\n' : '') + entry + '\n';
        await this.writeFile(gitignorePath, newContent);
        console.log(`Added ${entry} to .gitignore`);
      }
    } catch (error) {
      console.error('Failed to update .gitignore:', error);
    }
  }

  async ensureIntentionalDirectory(repoPath: string): Promise<void> {
    try {
      const intentionalDir = path.join(repoPath, '.intentional.dev');
      const commitsDir = path.join(intentionalDir, 'commits');
      const branchesDir = path.join(intentionalDir, 'branches');
      
      await this.ensureDirectory(commitsDir);
      await this.ensureDirectory(branchesDir);
      
      await this.ensureGitignoreEntry(repoPath);
      
      console.log('Ensured .intentional.dev directory structure exists');
    } catch (error) {
      console.error('Failed to create .intentional.dev directory:', error);
    }
  }

  async installGitHooks(repoPath: string, hooksSourceDir: string): Promise<void> {
    try {
      const hooksDir = path.join(repoPath, '.git', 'hooks');
      
      await this.ensureDirectory(hooksDir);
      
      const postCommitSource = path.join(hooksSourceDir, 'post-commit');
      const postCommitDest = path.join(hooksDir, 'post-commit');
      
      await this.copyFile(postCommitSource, postCommitDest);
      await this.chmod(postCommitDest, '755');
      
      console.log('Git hooks installed successfully');
    } catch (error) {
      console.error('Failed to install git hooks:', error);
    }
  }

  async checkForUnprocessedCommits(repoPath: string): Promise<void> {
    try {
      const commitsDir = path.join(repoPath, '.intentional.dev', 'commits');
      
      try {
        const files = await this.readdir(commitsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
          const filePath = path.join(commitsDir, file);
          const commit = await this.readJsonFile<any>(filePath);
          
          if (commit && !commit.processed) {
            console.log('Unprocessed commit found:', commit.hash);
            
            commit.processed = true;
            commit.processedAt = new Date().toISOString();
            
            await this.writeJsonFile(filePath, commit);
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error('Error checking commits:', error);
        }
      }
    } catch (error) {
      console.error('Failed to check for unprocessed commits:', error);
    }
  }
}