import { Module, Global } from '@nestjs/common';
import { IpcService } from './ipc.service';
import { IpcHandler } from './ipc.handler';

@Global()
@Module({
  providers: [IpcService, IpcHandler],
  exports: [IpcService],
})
export class IpcModule {}