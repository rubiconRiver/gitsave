import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { GitService } from '../services/GitService';
import { BranchService } from '../services/BranchService';
import { FileService } from '../services/FileService';
import { RepoInfo } from '../types';
import { StateManager } from '../state/StateManager';

export interface IPCContext {
  gitService: GitService;
  branchService: BranchService;
  fileService: FileService;
  stateManager: StateManager;
  getCurrentRepo: () => RepoInfo;
  handleBranchChange: (branch: string) => void;
  loadRepository?: (path: string) => Promise<boolean>;
  mb?: any; // Menubar instance
  getCollaborationStore?: () => any; // CollaborationStore instance
  updateCollaborationActivity?: (message: string) => Promise<void>;
}

export type IPCHandler = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>;

export class IPCRouter {
  private handlers = new Map<string, IPCHandler>();

  constructor(private context: IPCContext) {}

  register(channel: string, handler: IPCHandler): void {
    this.handlers.set(channel, handler);
    ipcMain.handle(channel, handler);
  }

  registerModule(module: { [key: string]: IPCHandler }): void {
    Object.entries(module).forEach(([channel, handler]) => {
      this.register(channel, handler.bind(this.context));
    });
  }

  unregisterAll(): void {
    this.handlers.forEach((_, channel) => {
      ipcMain.removeHandler(channel);
    });
    this.handlers.clear();
  }
}