import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CamerasService } from './cameras.service';
import type { CreateCameraDto, UpdateCameraDto } from './dto/cam.dto';

@Controller('cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get()
  async list() {
    try {
      return await this.camerasService.listCameras();
    } catch (error) {
      console.error('Camera retrieval API error:', error);
      throw new HttpException(
        { success: false, message: 'Failed to retrieve cameras' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async create(@Body() body: CreateCameraDto) {
    try {
      return await this.camerasService.createCamera(body.camera);
    } catch (error) {
      console.error('Camera create API error:', error);
      throw new HttpException(
        { success: false, message: 'Failed to create camera' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  async update(@Body() body: UpdateCameraDto) {
    try {
      return await this.camerasService.updateCamera(body.camera);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Camera update API error:', error);
      throw new HttpException(
        { success: false, message: 'Failed to update camera' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.camerasService.deleteCamera(decodeURIComponent(id));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Camera delete API error:', error);
      throw new HttpException(
        { success: false, message: 'Failed to delete camera' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
