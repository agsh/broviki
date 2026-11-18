import { Global, Module } from '@nestjs/common';
import { OnvifService } from './onvif.service';

@Global()
@Module({
  providers: [OnvifService],
  exports: [OnvifService],
})
export class OnvifModule {}
