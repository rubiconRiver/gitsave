import { IPCHandler, IPCContext } from '../IPCRouter';

export const collabHandlers: { [key: string]: IPCHandler } = {
  'collab:read': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    const collabData = this.stateManager.getStateValue('userCollabData');
    return { success: true, data: collabData };
  },

  'collab:write': async function(this: IPCContext, _, data: any) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      await this.stateManager.saveCollaborationData(data);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  'collab:readTeam': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      // Trigger sync to get latest team data
      await this.stateManager.sync();
      
      const teamMembers = this.stateManager.getStateValue('teamMembers');
      const teamData = teamMembers.map(member => member.data);
      
      return { success: true, data: teamData };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};