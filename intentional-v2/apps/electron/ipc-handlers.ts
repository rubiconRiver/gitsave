import { ipcMain } from 'electron'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../backend/src/app.module'

let nestApp: any

export async function setupIpcHandlers() {
  // Initialize Nest.js app in the main process
  nestApp = await NestFactory.createApplicationContext(AppModule)
  
  // Handle API requests from renderer
  ipcMain.handle('api-request', async (event, { endpoint, method, data }) => {
    try {
      // Route the request to the appropriate Nest.js service
      // This is a simplified example - you'd want more robust routing
      
      const [resource, ...pathParts] = endpoint.split('/')
      
      switch (resource) {
        case 'git':
          const gitService = nestApp.get('GitService')
          return await handleGitRequest(gitService, pathParts.join('/'), method, data)
          
        case 'intents':
          const intentsService = nestApp.get('IntentsService')
          return await handleIntentsRequest(intentsService, pathParts.join('/'), method, data)
          
        case 'utils':
          const utilsService = nestApp.get('UtilsService')
          return await handleUtilsRequest(utilsService, pathParts.join('/'), method, data)
          
        default:
          throw new Error(`Unknown resource: ${resource}`)
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}

async function handleGitRequest(service: any, path: string, method: string, data: any) {
  switch (path) {
    case 'status':
      return { data: await service.getStatus() }
    case 'commit':
      await service.commit(data)
      return { data: null }
    case 'checkout':
      await service.checkout(data.branch)
      return { data: null }
    case 'branch':
      await service.createBranch(data.name)
      return { data: null }
    case 'fetch':
      await service.fetch()
      return { data: null }
    case 'pull':
      await service.pull()
      return { data: null }
    case 'push':
      await service.push()
      return { data: null }
    case 'undo':
      await service.undo()
      return { data: null }
    default:
      throw new Error(`Unknown git operation: ${path}`)
  }
}

async function handleIntentsRequest(service: any, path: string, method: string, data: any) {
  // Similar implementation for intents
  // ...
  return { data: null }
}

async function handleUtilsRequest(service: any, path: string, method: string, data: any) {
  // Similar implementation for utils
  // ...
  return { data: null }
}