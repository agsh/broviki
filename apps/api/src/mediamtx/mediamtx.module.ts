import { Global, Module } from '@nestjs/common';
import { MediaMtxService } from './mediamtx.service';

@Global()
@Module({
  providers: [MediaMtxService],
  exports: [MediaMtxService],
})
export class MediaMtxModule {}
