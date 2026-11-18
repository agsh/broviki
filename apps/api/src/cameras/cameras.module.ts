import { Module } from '@nestjs/common';
import { CamController } from './cam.controller';
import { CameraEventsGateway } from './camera-events.gateway';
import { CamerasController } from './cameras.controller';
import { CamerasService } from './cameras.service';

@Module({
  controllers: [CamController, CamerasController],
  providers: [CamerasService, CameraEventsGateway],
})
export class CamerasModule {}
