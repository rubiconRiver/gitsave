import { SetMetadata } from '@nestjs/common'

export const IPC_CHANNEL = 'ipc-channel'

/**
 * Decorator to mark a method as an IPC handler
 * @param channel The IPC channel name to handle
 */
export function IpcHandle(channel: string): MethodDecorator {
  return SetMetadata(IPC_CHANNEL, channel)
}