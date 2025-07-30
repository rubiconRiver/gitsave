import { Controller, Injectable } from '@nestjs/common';
import { IpcHandle } from '../../ipc/ipc.handler';
import { RepositoryService } from '../services/repository.service';

@Controller()
@Injectable()
export class RepositoryController {
  constructor(private repositoryService: RepositoryService) {}
  
  @IpcHandle('repository:load')
  async loadRepository(path: string) {
    const repo = await this.repositoryService.loadRepository(path);
    return repo;
  }
  
  @IpcHandle('repository:get-current')
  async getCurrentRepo() {
    return this.repositoryService.getCurrentRepo();
  }
  
  @IpcHandle('repository:get-status')
  async getStatus() {
    return this.repositoryService.getStatus();
  }
  
  @IpcHandle('repository:stage-all')
  async stageAll() {
    await this.repositoryService.stageAll();
    return { success: true };
  }
  
  @IpcHandle('repository:commit')
  async commit(message: string, author?: { name: string; email: string }) {
    const sha = await this.repositoryService.commit(message, author);
    return { success: true, sha };
  }
  
  @IpcHandle('repository:get-history')
  async getHistory(limit: number = 50) {
    return this.repositoryService.getHistory(limit);
  }
  
  @IpcHandle('repository:switch-branch')
  async switchBranch(branchName: string) {
    await this.repositoryService.switchBranch(branchName);
    return { success: true };
  }
}