import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { CamerasService } from './cameras.service';
import type { CamRequestDto, ControlRequestDto } from './dto/cam.dto';
import { formatOnvifError } from '../onvif/onvif-error.util';

@Controller('cam')
export class CamController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get(':id/events')
  @Header('Cache-Control', 'no-store')
  getEvents(@Param('id') id: string, @Query('after') after?: string) {
    const afterSeq = after ? Number.parseInt(after, 10) : 0;
    return this.camerasService.getCameraEvents(
      decodeURIComponent(id),
      Number.isFinite(afterSeq) ? afterSeq : 0,
    );
  }

  @Delete(':id/events')
  clearEvents(@Param('id') id: string) {
    return this.camerasService.clearCameraEvents(decodeURIComponent(id));
  }

  @Get(':id/snapshot')
  @Header('Cache-Control', 'private, max-age=15')
  async getSnapshot(@Param('id') id: string): Promise<StreamableFile> {
    try {
      const result = await this.camerasService.getSnapshot(decodeURIComponent(id));
      if (!result) {
        throw new NotFoundException({
          success: false,
          message: 'Snapshot unavailable for this camera',
        });
      }

      return new StreamableFile(result.buffer, {
        type: result.contentType,
        disposition: 'inline',
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Snapshot API error:', error);
      throw new HttpException(
        { success: false, message: 'Failed to fetch snapshot' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/playback')
  async getPlayback(
    @Param('id') id: string,
    @Headers('x-forwarded-host') forwardedHost?: string,
    @Headers('host') host?: string,
  ) {
    try {
      const requestHost = forwardedHost || host;
      const result = await this.camerasService.getPlayback(
        decodeURIComponent(id),
        requestHost,
      );
      if (!result.success) {
        throw new HttpException(result, HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Playback API error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to prepare playback';
      throw new HttpException({ success: false, message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async handleAction(@Body() body: CamRequestDto) {
    try {
      const result = await this.camerasService.handleCamAction(body);
      if (!result.success) {
        throw new HttpException(result, HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = formatOnvifError(error);
      console.error('Camera API error:', message, error);
      throw new HttpException(
        { success: false, message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('control')
  async handleControl(@Body() body: ControlRequestDto) {
    try {
      const result = await this.camerasService.handleControl(body);
      if (result.status !== 200) {
        throw new HttpException(result.body, result.status);
      }
      return result.body;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const message = formatOnvifError(error);
      console.error('PTZ command error:', message, error);
      throw new HttpException({ success: false, message }, HttpStatus.BAD_REQUEST);
    }
  }
}
