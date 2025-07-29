import { IPCHandler, IPCContext } from '../IPCRouter';
import * as path from 'path';
import * as fs from 'fs/promises';

export const hookHandlers: { [key: string]: IPCHandler } = {
  'hooks:install': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      await this.fileService.installGitHooks(currentRepo.path, path.join(__dirname, '..', '..', '..', '..', 'src', 'hooks'));
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to install hooks' };
    }
  },

  'agent:configure': async function(this: IPCContext, _, config: any) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const configDir = path.join(currentRepo.path, '.intentional.dev', 'config');
      await fs.mkdir(configDir, { recursive: true });
      
      const configPath = path.join(configDir, 'agent.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to save agent configuration' };
    }
  }
};