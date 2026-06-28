import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { BackupService, BackupData } from '../../application/backup/backup.service';

@Controller('api/backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  async exportBackup(@CurrentUser() user: UserEntity) {
    return this.backupService.exportBackup(user.id);
  }

  @Post('import')
  async importBackup(@CurrentUser() user: UserEntity, @Body() data: BackupData) {
    return this.backupService.importBackup(user.id, data);
  }
}
