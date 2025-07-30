import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ipcMain } from 'electron';
import { IpcService } from './modules/ipc/ipc.service';

/**
 * Initialize the NestJS application within Electron's main process
 * This is called from the Electron main file
 */
export async function initializeBackend() {
  // Create NestJS app without HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Get IPC service to handle all IPC communication
  const ipcService = app.get(IpcService);
  
  // Initialize IPC handlers
  ipcService.initialize();
  
  console.log('🚀 Intentional backend initialized in Electron main process');
  
  return app;
}