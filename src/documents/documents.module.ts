import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { StorageService } from '../common/services/storage.service';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { SchoolConfigModule } from '../school-config/school-config.module';
import { SchoolsModule } from '../schools/schools.module';
import { UsersModule } from '../users/users.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentTemplate } from './entities/document-template.entity';
import { IssuedDocument } from './entities/issued-document.entity';
import {
  DocumentAttendanceRecordsRepository,
  DocumentGradeRecordsRepository,
  DocumentTemplatesRepository,
  IssuedDocumentsRepository
} from './repositories';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTemplate, IssuedDocument, GradeRecord, AttendanceRecord]),
    UsersModule,
    SchoolsModule,
    SchoolConfigModule
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    PdfGeneratorService,
    StorageService,
    DocumentTemplatesRepository,
    IssuedDocumentsRepository,
    DocumentGradeRecordsRepository,
    DocumentAttendanceRecordsRepository
  ],
  exports: [DocumentsService]
})
export class DocumentsModule {}
