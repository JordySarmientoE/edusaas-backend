import { AcademicCyclesModule } from './academic-cycles/academic-cycles.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AttendanceModule } from './attendance/attendance.module';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';
import { ClassesModule } from './classes/classes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { databaseConfig } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { DisciplineModule } from './discipline/discipline.module';
import { DocumentsModule } from './documents/documents.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { GradesModule } from './grades/grades.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { SchoolConfigModule } from './school-config/school-config.module';
import { SchoolsModule } from './schools/schools.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100
      }
    ]),
    AuditModule,
    AcademicCyclesModule,
    AnnouncementsModule,
    AttendanceModule,
    UsersModule,
    AuthModule,
    ClassesModule,
    DisciplineModule,
    DocumentsModule,
    EnrollmentModule,
    GradesModule,
    HealthModule,
    NotificationsModule,
    ReportsModule,
    SchoolsModule,
    SchoolConfigModule,
    TasksModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
