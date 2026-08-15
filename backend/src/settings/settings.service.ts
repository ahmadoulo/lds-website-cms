import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.siteSettings.findMany();
    // Convert array to key-value object for easy frontend consumption
    const config: Record<string, any> = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    return config;
  }

  async findOne(key: string) {
    const setting = await this.prisma.siteSettings.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async update(key: string, updateSettingDto: UpdateSettingDto) {
    // Upsert the setting if it doesn't exist
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value: updateSettingDto.value },
      create: { 
        key, 
        value: updateSettingDto.value, 
        type: typeof updateSettingDto.value === 'object' ? 'json' : typeof updateSettingDto.value 
      }
    });
  }
}
