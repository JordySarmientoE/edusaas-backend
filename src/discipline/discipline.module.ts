import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';
import { Incident } from './entities/incident.entity';
import { IncidentsRepository } from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident]),
    forwardRef(() => UsersModule),
    forwardRef(() => NotificationsModule)
  ],
  controllers: [DisciplineController],
  providers: [DisciplineService, IncidentsRepository],
  exports: [DisciplineService]
})
export class DisciplineModule {}
