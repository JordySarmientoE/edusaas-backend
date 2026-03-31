import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AdminUserMembershipDto } from './dto/admin-user-membership.dto';
import { AssociateUserByEmailDto } from './dto/associate-user-by-email.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FamilyLinksDto } from './dto/family-links.dto';
import { LinkedStudentDto } from './dto/linked-student.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.SCHOOL_ADMIN)
@ApiTags('Users')
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un usuario dentro del colegio autenticado' })
  @ApiCreatedResponse({ description: 'Usuario global creado y asociado al colegio autenticado' })
  createUser(@Body() dto: CreateUserDto, @Req() request: { schoolId?: string }) {
    return this.usersService.createUser(dto, request.schoolId);
  }

  @Post('associate-email')
  @ApiOperation({ summary: 'Asociar o invitar a un usuario por correo dentro del colegio autenticado' })
  associateByEmail(
    @Body() dto: AssociateUserByEmailDto,
    @Req() request: { schoolId?: string },
    @CurrentUser() user: JwtPayload
  ) {
    return this.usersService.associateUserByEmail(dto, request.schoolId!, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar membresias administrables del colegio autenticado' })
  @ApiPaginatedResponse(AdminUserMembershipDto)
  findAll(@Query() filters: UserFiltersDto, @Req() request: { schoolId?: string }) {
    return this.usersService.findAll(filters, request.schoolId!);
  }

  @Get('me/linked-students')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Listar los hijos vinculados del padre autenticado' })
  @ApiOkResponse({ type: LinkedStudentDto, isArray: true })
  findLinkedStudents(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.usersService.getLinkedStudentsForParent(user.sub, request.schoolId!);
  }

  @Get('me/profile')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  getOwnProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getOwnProfile(user.sub);
  }

  @Patch('me/profile')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Actualizar datos básicos del perfil autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  updateOwnProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(user.sub, dto);
  }

  @Post('me/avatar')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir o reemplazar la foto de perfil del usuario autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  uploadOwnAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: { originalname: string; buffer: Buffer; mimetype?: string }
  ) {
    return this.usersService.uploadOwnAvatar(user.sub, file);
  }

  @Delete('me/avatar')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Quitar la foto de perfil del usuario autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  removeOwnAvatar(@CurrentUser() user: JwtPayload) {
    return this.usersService.removeOwnAvatar(user.sub);
  }

  @Patch('me/password')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado' })
  @ApiOkResponse({ type: MessageResponseDto })
  async changeOwnPassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangeOwnPasswordDto) {
    await this.usersService.changeOwnPassword(user.sub, dto);
    return { message: 'Contraseña actualizada correctamente. Inicia sesión de nuevo.' };
  }

  @Get('me/family-links')
  @Roles(Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Consultar los vínculos familiares del usuario autenticado' })
  @ApiOkResponse({ type: FamilyLinksDto })
  getMyFamilyLinks(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.usersService.getFamilyLinks(user.sub, request.schoolId!, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una membresia del colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la membresia' })
  @ApiOkResponse({ type: AdminUserMembershipDto })
  findById(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.usersService.findMembershipDetail(id, request.schoolId!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una membresia del colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la membresia' })
  @ApiOkResponse({ type: AdminUserMembershipDto })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.usersService.updateMembership(id, dto, request.schoolId!);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una membresia del colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la membresia' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deactivateUser(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.usersService.deactivateMembership(id, request.schoolId!);
    return { message: 'Membresía desactivada correctamente' };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una membresia del colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la membresia' })
  @ApiOkResponse({ type: MessageResponseDto })
  async activateUser(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.usersService.activateMembership(id, request.schoolId!);
    return { message: 'Membresía activada correctamente' };
  }

  @Post(':parentId/link-student/:studentId')
  @ApiOperation({ summary: 'Vincular un padre con un alumno' })
  @ApiParam({ name: 'parentId', description: 'Identificador unico del padre' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiOkResponse({ type: MessageResponseDto })
  async linkParentToStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
    @Req() request: { schoolId?: string }
  ) {
    await this.usersService.linkParentToStudent(parentId, studentId, request.schoolId!);
    return { message: 'Padre vinculado al alumno correctamente' };
  }

  @Post(':studentId/assign-class/:classId')
  @ApiOperation({ summary: 'Asignar un alumno a una clase' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: MessageResponseDto })
  async assignStudentToClass(
    @Param('studentId') studentId: string,
    @Param('classId') classId: string,
    @Req() request: { schoolId?: string }
  ) {
    await this.usersService.assignStudentToClass(studentId, classId, request.schoolId!);
    return { message: 'Alumno asignado a la clase correctamente' };
  }
}
