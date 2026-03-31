import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from '../common/services/storage.service';
import { SchoolsModule } from '../schools/schools.module';
import { SchoolConfigController } from './school-config.controller';
import { SchoolConfigService } from './school-config.service';
import { SchoolConfig } from './entities/school-config.entity';
import { SchoolConfigsRepository } from './repositories';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolConfig]), SchoolsModule],
  controllers: [SchoolConfigController],
  providers: [SchoolConfigService, StorageService, SchoolConfigsRepository],
  exports: [SchoolConfigService]
})
export class SchoolConfigModule {}
