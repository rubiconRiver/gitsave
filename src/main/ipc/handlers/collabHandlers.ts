import { IPCHandler, IPCContext } from '../IPCRouter';
import * as path from 'path';
import * as fs from 'fs/promises';

export const collabHandlers: { [key: string]: IPCHandler } = {
  'collab:read': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const collabPath = path.join(currentRepo.path, 'intentional.dev', 'collaboration', 'garett.json');
      const data = await fs.readFile(collabPath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } catch (error: any) {
      // File doesn't exist yet, return empty structure
      return { 
        success: true, 
        data: {
          username: 'garett',
          email: '',
          lastUpdated: new Date().toISOString(),
          tasks: [],
          goals: [],
          builds: [],
          updates: []
        }
      };
    }
  },

  'collab:write': async function(this: IPCContext, _, data: any) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const collabDir = path.join(currentRepo.path, 'intentional.dev', 'collaboration');
      await fs.mkdir(collabDir, { recursive: true });
      
      const collabPath = path.join(collabDir, 'garett.json');
      data.lastUpdated = new Date().toISOString();
      
      await fs.writeFile(collabPath, JSON.stringify(data, null, 2));
      
      // Auto-commit collaboration changes
      await this.gitService.addAll();
      await this.gitService.commit('Update collaboration data');
      
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  'collab:readTeam': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      // Fetch latest changes
      await this.gitService.fetch();
      
      // Get list of collaboration files from other team members
      const teamData = [];
      
      try {
        // Try to read partner's data using git show
        const partnerData = await this.gitService.show(['origin/main:intentional.dev/collaboration/partner.json']);
        teamData.push(JSON.parse(partnerData));
      } catch (e) {
        // Partner file doesn't exist yet
      }
      
      return { success: true, data: teamData };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};