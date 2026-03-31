import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClassOwnershipGuard } from '../common/guards/class-ownership.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AnnouncementFiltersDto } from './dto/announcement-filters.dto';
import { AnnouncementCommentDto } from './dto/announcement-comment.dto';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comment.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ParentAnnouncementDto } from './dto/parent-announcement.dto';
import { StudentAnnouncementDto } from './dto/student-announcement.dto';
import { UpdateAnnouncementCommentDto } from './dto/update-announcement-comment.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementsService } from './announcements.service';

@Controller()
@ApiTags('Announcements')
@ApiBearerAuth('access-token')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post('announcements')
  @Roles(Role.TEACHER)
  @UseGuards(ClassOwnershipGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Crear un aviso para una clase' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', enum: ['announcement', 'reminder', 'material', 'link'] },
        linkUrl: { type: 'string', nullable: true },
        files: { type: 'array', items: { type: 'string', format: 'binary' } }
      },
      required: ['classId', 'title', 'message', 'type']
    }
  })
  @ApiCreatedResponse({ type: Announcement })
  createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @Req() request: { schoolId?: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Array<{ originalname: string; buffer: Buffer; mimetype?: string }>
  ) {
    return this.announcementsService.createAnnouncement(dto, request.schoolId!, user.sub, files ?? []);
  }

  @Get('announcements/class/:classId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar avisos por clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: PaginatedResultDto<Announcement> })
  findByClass(
    @Param('classId') classId: string,
    @Query() filters: AnnouncementFiltersDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.announcementsService.findByClass(classId, request.schoolId!, filters);
  }

  @Get('my/announcements')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Consultar los avisos del alumno autenticado' })
  @ApiOkResponse({ type: StudentAnnouncementDto, isArray: true })
  getMyAnnouncements(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.announcementsService.findByStudent(user.sub, request.schoolId!);
  }

  @Get('my/children/announcements')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Consultar los avisos visibles para los hijos vinculados' })
  @ApiOkResponse({ type: ParentAnnouncementDto, isArray: true })
  getChildrenAnnouncements(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.announcementsService.findByParent(user.sub, request.schoolId!);
  }

  @Get('announcements/:id/comments')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Consultar el hilo de comentarios de un aviso' })
  @ApiParam({ name: 'id', description: 'Identificador unico del aviso' })
  @ApiOkResponse({ type: AnnouncementCommentDto, isArray: true })
  getComments(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    return this.announcementsService.getComments(id, user.sub, request.schoolId!);
  }

  @Post('announcements/:id/comments')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Agregar un comentario a un aviso' })
  @ApiParam({ name: 'id', description: 'Identificador unico del aviso' })
  @ApiCreatedResponse({ type: AnnouncementCommentDto })
  createComment(
    @Param('id') id: string,
    @Body() dto: CreateAnnouncementCommentDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    return this.announcementsService.createComment(id, dto, user.sub, request.schoolId!);
  }

  @Patch('announcements/comments/:commentId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Editar un comentario de aviso' })
  @ApiParam({ name: 'commentId', description: 'Identificador unico del comentario' })
  @ApiOkResponse({ type: AnnouncementCommentDto })
  updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateAnnouncementCommentDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    return this.announcementsService.updateComment(commentId, dto, user.sub, request.schoolId!);
  }

  @Delete('announcements/comments/:commentId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Eliminar un comentario de aviso' })
  @ApiParam({ name: 'commentId', description: 'Identificador unico del comentario' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    await this.announcementsService.deleteComment(commentId, user.sub, request.schoolId!);
    return { message: 'Comentario eliminado correctamente' };
  }

  @Patch('announcements/:id')
  @Roles(Role.TEACHER)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Actualizar un aviso' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', enum: ['announcement', 'reminder', 'material', 'link'] },
        linkUrl: { type: 'string', nullable: true },
        files: { type: 'array', items: { type: 'string', format: 'binary' } }
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Identificador unico del aviso' })
  @ApiOkResponse({ type: Announcement })
  updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() request: { schoolId?: string },
    @UploadedFiles() files?: Array<{ originalname: string; buffer: Buffer; mimetype?: string }>
  ) {
    return this.announcementsService.updateAnnouncement(id, dto, request.schoolId!, files ?? []);
  }

  @Delete('announcements/:id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Eliminar un aviso' })
  @ApiParam({ name: 'id', description: 'Identificador unico del aviso' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteAnnouncement(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.announcementsService.deleteAnnouncement(id, request.schoolId!);
    return { message: 'Aviso eliminado correctamente' };
  }
}
