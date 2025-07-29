import { IPCHandler, IPCContext } from '../IPCRouter';
import { dialog } from 'electron';
import * as path from 'path';

export const repoHandlers: { [key: string]: IPCHandler } = {
  'repo:info': async function(this: IPCContext) {
    return this.getCurrentRepo();
  },

  'repo:select': async function(this: IPCContext) {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const repoPath = result.filePaths[0];
      
      // We need to access loadRepository from main.ts context
      // This will be passed through the context
      const loadRepository = (this as any).loadRepository;
      const loaded = await loadRepository(repoPath);
      
      if (loaded) {
        return { success: true, repo: this.getCurrentRepo() };
      } else {
        return { error: 'Selected directory is not a Git repository' };
      }
    }
    
    return { canceled: true };
  }
};