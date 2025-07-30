import { SetMetadata } from '@nestjs/common';

export const IPC_HANDLER_METADATA = 'ipc-handler';

/**
 * Decorator to mark a method as an IPC handler
 * @param channel The IPC channel name
 */
export function IpcHandle(channel: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(IPC_HANDLER_METADATA, { channel })(target, propertyKey, descriptor);
    
    // Register the handler immediately
    // This will be properly initialized when the app starts
    const handlers = Reflect.getMetadata('ipc-handlers', target.constructor) || [];
    handlers.push({ channel, propertyKey });
    Reflect.defineMetadata('ipc-handlers', handlers, target.constructor);
    
    return descriptor;
  };
}