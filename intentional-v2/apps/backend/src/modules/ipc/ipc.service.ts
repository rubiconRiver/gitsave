import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface IpcHandlerMetadata {
  channel: string;
  target: any;
  propertyKey: string;
}

@Injectable()
export class IpcService implements OnModuleInit {
  private handlers: Map<string, IpcHandlerMetadata> = new Map();
  
  constructor(
    private moduleRef: ModuleRef,
    private eventEmitter: EventEmitter2,
  ) {}
  
  onModuleInit() {
    // Module initialization
  }
  
  /**
   * Initialize all IPC handlers
   */
  initialize() {
    console.log('Initializing IPC handlers...');
    
    // Set up all registered handlers
    this.handlers.forEach((metadata, channel) => {
      ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: any[]) => {
        try {
          const instance = this.moduleRef.get(metadata.target.constructor, { strict: false });
          const result = await instance[metadata.propertyKey](...args);
          return { success: true, data: result };
        } catch (error) {
          console.error(`Error in IPC handler ${channel}:`, error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
    });
    
    console.log(`Registered ${this.handlers.size} IPC handlers`);
  }
  
  /**
   * Register an IPC handler
   */
  registerHandler(channel: string, target: any, propertyKey: string) {
    this.handlers.set(channel, { channel, target, propertyKey });
  }
  
  /**
   * Send event to all renderer processes
   */
  broadcast(channel: string, data: any) {
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
  
  /**
   * Send event to specific window
   */
  sendTo(windowId: number, channel: string, data: any) {
    const window = BrowserWindow.fromId(windowId);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  }
}