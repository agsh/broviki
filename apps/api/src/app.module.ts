import { Module } from '@nestjs/common';
import { CamerasModule } from './cameras/cameras.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { MediaMtxModule } from './mediamtx/mediamtx.module';
import { OnvifModule } from './onvif/onvif.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MediaMtxModule, OnvifModule, CamerasModule, DiscoveryModule],
})
export class AppModule {}
