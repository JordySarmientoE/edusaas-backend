import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AdminUserMembershipDto } from '../users/dto/admin-user-membership.dto';
import { User } from '../users/entities/user.entity';
import { AssignSchoolAdminDto } from './dto/assign-school-admin.dto';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolFiltersDto } from './dto/school-filters.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';

@Controller('schools')
@Roles(Role.SUPER_ADMIN)
@ApiTags('Schools')
@ApiBearerAuth('access-token')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo colegio' })
  @ApiCreatedResponse({ type: School })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.createSchool(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar colegios registrados' })
  @ApiPaginatedResponse(School)
  findAll(@Query() filters: SchoolFiltersDto) {
    return this.schoolsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: School })
  findById(@Param('id') id: string) {
    return this.schoolsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar los datos de un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: School })
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.updateSchool(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deactivateSchool(@Param('id') id: string) {
    await this.schoolsService.deactivateSchool(id);
    return { message: 'Colegio desactivado correctamente' };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: MessageResponseDto })
  async activateSchool(@Param('id') id: string) {
    await this.schoolsService.activateSchool(id);
    return { message: 'Colegio activado correctamente' };
  }

  @Post(':id/admin')
  @ApiOperation({ summary: 'Asignar o invitar al administrador principal de un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiCreatedResponse({
    description: 'Crea la membresia school_admin si el usuario ya existe o deja una invitacion pendiente'
  })
  assignSchoolAdmin(
    @Param('id') id: string,
    @Body() dto: AssignSchoolAdminDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.schoolsService.assignSchoolAdmin(id, dto, user.sub);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Listar usuarios asociados a un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: User, isArray: true })
  getUsersBySchool(@Param('id') id: string) {
    return this.schoolsService.getUsersBySchool(id);
  }

  @Get(':id/admins')
  @ApiOperation({ summary: 'Listar administradores activos de un colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: AdminUserMembershipDto, isArray: true })
  getAdminsBySchool(@Param('id') id: string) {
    return this.schoolsService.getAdminsBySchool(id);
  }
}
