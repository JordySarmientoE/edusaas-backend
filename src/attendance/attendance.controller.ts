import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClassOwnershipGuard } from '../common/guards/class-ownership.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { DateRangeDto } from './dto/date-range.dto';
import { TakeAttendanceDto } from './dto/take-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Controller()
@ApiTags('Attendance')
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('attendance')
  @Roles(Role.TEACHER)
  @UseGuards(ClassOwnershipGuard)
  @ApiOperation({ summary: 'Registrar asistencia por clase y fecha' })
  @ApiOkResponse({ type: AttendanceRecord, isArray: true })
  takeAttendance(@Body() dto: TakeAttendanceDto, @Req() request: { schoolId?: string }) {
    return this.attendanceService.takeAttendance(dto, request.schoolId!);
  }

  @Get('attendance/class/:classId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Consultar asistencia por clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: AttendanceRecord, isArray: true })
  getByClass(
    @Param('classId') classId: string,
    @Query() filters: DateRangeDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.attendanceService.getByClass(classId, filters, request.schoolId!);
  }

  @Get('attendance/student/:studentId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Consultar asistencia historica de un alumno' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiOkResponse({ type: AttendanceRecord, isArray: true })
  getByStudent(@Param('studentId') studentId: string, @Req() request: { schoolId?: string }) {
    return this.attendanceService.getByStudent(studentId, request.schoolId!);
  }

  @Get('my/attendance')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Consultar la asistencia del alumno autenticado' })
  @ApiOkResponse({ type: AttendanceRecord, isArray: true })
  getMyAttendance(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.attendanceService.getByStudent(user.sub, request.schoolId!);
  }

  @Get('my/children/attendance')
  @Roles(Role.PARENT, Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Consultar la asistencia de los hijos o estudiantes vinculados al usuario' })
  @ApiOkResponse({ type: AttendanceRecord, isArray: true })
  getChildrenAttendance(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.attendanceService.getByParent(user.sub, request.schoolId!);
  }
}
