import { Injectable, OnModuleInit } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNEL } from '../decorators/ipc.decorator'

@Injectable()
export class IpcService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.registerHandlers()
  }

  private registerHandlers() {
    const providers = this.discovery.getProviders()
    
    providers
      .filter(wrapper => wrapper.isDependencyTreeStatic())
      .filter(wrapper => wrapper.instance)
      .forEach(wrapper => {
        const { instance } = wrapper
        const prototype = Object.getPrototypeOf(instance)
        
        this.scanner.scanFromPrototype(
          instance,
          prototype,
          (methodName: string) => {
            const channel = this.reflector.get<string>(
              IPC_CHANNEL,
              instance[methodName]
            )
            
            if (channel) {
              this.registerHandler(channel, instance, methodName)
            }
          }
        )
      })
  }

  private registerHandler(channel: string, instance: any, methodName: string) {
    if (ipcMain.listenerCount(channel) > 0) {
      ipcMain.removeHandler(channel)
    }
    
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: any[]) => {
      try {
        const result = await instance[methodName](...args)
        return result
      } catch (error) {
        console.error(`Error in IPC handler ${channel}:`, error)
        throw error
      }
    })
    
    console.log(`Registered IPC handler: ${channel}`)
  }
}