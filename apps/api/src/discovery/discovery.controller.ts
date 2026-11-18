import { Body, Controller, Get, Post } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('startup')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  async discover() {
    return this.discoveryService.probe();
  }

  @Post()
  greet(@Body() body: { name?: string }) {
    return this.discoveryService.greet(body.name);
  }
}
