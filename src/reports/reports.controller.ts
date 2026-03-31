import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ExportChildReportCardPdfDto } from './dto/export-child-report-card-pdf.dto';
import { ExportGradeControlPdfDto } from './dto/export-grade-control-pdf.dto';
import { ExportFiltersDto } from './dto/export-filters.dto';
import { ExportResponseDto } from './dto/export-response.dto';
import { ExportStudentReportCardPdfDto } from './dto/export-student-report-card-pdf.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@ApiTags('Reports')
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis/attendance/:cycleId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener KPI de asistencia por ciclo academico' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totalRecords: { type: 'number' },
        present: { type: 'number' },
        absent: { type: 'number' },
        late: { type: 'number' },
        attendanceRate: { type: 'number' }
      }
    }
  })
  getAttendanceKpi(@Param('cycleId') cycleId: string, @Req() request: { schoolId?: string }) {
    return this.reportsService.getAttendanceKpi(request.schoolId!, cycleId);
  }

  @Get('kpis/grades/:cycleId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener KPI de notas por ciclo academico' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totalGrades: { type: 'number' },
        average: { type: 'number', nullable: true }
      }
    }
  })
  getGradesKpi(@Param('cycleId') cycleId: string, @Req() request: { schoolId?: string }) {
    return this.reportsService.getGradesKpi(request.schoolId!, cycleId);
  }

  @Get('kpis/tasks/pending')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener KPI de tareas pendientes' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totalPendingTasks: { type: 'number' }
      }
    }
  })
  getPendingTasksKpi(@Req() request: { schoolId?: string }) {
    return this.reportsService.getPendingTasksKpi(request.schoolId!);
  }

  @Get('kpis/discipline/:cycleId')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener KPI disciplinario por ciclo academico' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totalIncidents: { type: 'number' }
      }
    }
  })
  getDisciplineKpi(@Param('cycleId') cycleId: string, @Req() request: { schoolId?: string }) {
    return this.reportsService.getDisciplineKpi(request.schoolId!, cycleId);
  }

  @Post('export/csv')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar informacion operativa en formato CSV' })
  @ApiOkResponse({ type: ExportResponseDto })
  async exportCsv(@Body() dto: ExportFiltersDto, @Req() request: { schoolId?: string }) {
    const buffer = await this.reportsService.exportToCsv(dto.entity, dto, request.schoolId!);
    return {
      entity: dto.entity,
      format: 'csv',
      contentBase64: buffer.toString('base64')
    };
  }

  @Post('export/excel')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar informacion operativa en formato Excel' })
  @ApiOkResponse({ type: ExportResponseDto })
  async exportExcel(@Body() dto: ExportFiltersDto, @Req() request: { schoolId?: string }) {
    const buffer = await this.reportsService.exportToExcel(dto.entity, dto, request.schoolId!);
    return {
      entity: dto.entity,
      format: 'xlsx',
      contentBase64: buffer.toString('base64')
    };
  }

  @Post('export/grades-control-pdf')
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exportar un control de notas institucional en PDF por clase' })
  @ApiOkResponse({ type: ExportResponseDto })
  async exportGradesControlPdf(@Body() dto: ExportGradeControlPdfDto, @Req() request: { schoolId?: string }) {
    const buffer = await this.reportsService.exportGradesControlPdf(dto.classId, request.schoolId!, dto.cycleId);
    return {
      entity: 'grades_control',
      format: 'pdf',
      contentBase64: buffer.toString('base64')
    };
  }

  @Post('export/my-report-card-pdf')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Exportar la libreta individual del alumno autenticado en PDF' })
  @ApiOkResponse({ type: ExportResponseDto })
  async exportMyReportCardPdf(
    @Body() dto: ExportStudentReportCardPdfDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    const buffer = await this.reportsService.exportStudentReportCardPdf(user.sub, request.schoolId!, dto.cycleId);
    return {
      entity: 'student_report_card',
      format: 'pdf',
      contentBase64: buffer.toString('base64')
    };
  }

  @Post('export/child-report-card-pdf')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Exportar la libreta individual de un hijo vinculado en PDF' })
  @ApiOkResponse({ type: ExportResponseDto })
  async exportChildReportCardPdf(
    @Body() dto: ExportChildReportCardPdfDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    const buffer = await this.reportsService.exportChildReportCardPdf(
      user.sub,
      dto.studentId,
      request.schoolId!,
      dto.cycleId
    );
    return {
      entity: 'child_report_card',
      format: 'pdf',
      contentBase64: buffer.toString('base64')
    };
  }
}
