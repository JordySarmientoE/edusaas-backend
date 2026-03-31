import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { DocumentTemplate } from './entities/document-template.entity';
import { IssuedDocument } from './entities/issued-document.entity';

@Injectable()
export class DocumentTemplatesRepository extends TypeOrmRepository<DocumentTemplate> {
  constructor(dataSource: DataSource) {
    super(DocumentTemplate, dataSource);
  }
}

@Injectable()
export class IssuedDocumentsRepository extends TypeOrmRepository<IssuedDocument> {
  constructor(dataSource: DataSource) {
    super(IssuedDocument, dataSource);
  }
}

@Injectable()
export class DocumentGradeRecordsRepository extends TypeOrmRepository<GradeRecord> {
  constructor(dataSource: DataSource) {
    super(GradeRecord, dataSource);
  }
}

@Injectable()
export class DocumentAttendanceRecordsRepository extends TypeOrmRepository<AttendanceRecord> {
  constructor(dataSource: DataSource) {
    super(AttendanceRecord, dataSource);
  }
}
