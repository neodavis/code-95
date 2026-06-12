import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CabinetService } from './cabinet.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public QR-code lookup: rate-limited per IP (30/min covers humans
// scanning behind a shared NAT while blocking registry scraping).
@UseGuards(ThrottlerGuard)
@Throttle({ long: { ttl: 60000, limit: 30 } })
@Controller('registry')
export class RegistryController {
  constructor(private readonly cabinetService: CabinetService) {}

  @Get(':id')
  async getRegistryEntry(@Param('id') id: string): Promise<unknown> {
    let driverId: number | null = null;

    if (UUID_RE.test(id)) {
      driverId = await this.cabinetService.getDriverIdBySpkUuid(id);
    } else if (/^\d+$/.test(id)) {
      driverId = Number.parseInt(id, 10);
    } else {
      throw new BadRequestException('Invalid registry id');
    }

    if (driverId === null) {
      throw new NotFoundException('Registry entry not found');
    }

    const entry = await this.cabinetService.getRegistryEntry(driverId);
    if (!entry) throw new NotFoundException('Registry entry not found');
    return entry;
  }
}
