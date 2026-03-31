import { Controller, Get, Param, Post, Req, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateTemplateDto } from './dto/create-template.dto';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { DocumentTemplate } from './entities/document-template.entity';
import { IssuedDocument } from './entities/issued-document.entity';
import { DocumentsService } from './documents.service';

@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth('access-token')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('templates')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Crear una plantilla documental' })
  @ApiCreatedResponse({ type: DocumentTemplate })
  createTemplate(@Body() dto: CreateTemplateDto, @Req() request: { schoolId?: string }) {
    return this.documentsService.createTemplate(dto, request.schoolId!);
  }

  @Get('templates')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Listar plantillas documentales del colegio' })
  @ApiOkResponse({ type: DocumentTemplate, isArray: true })
  getTemplates(@Req() request: { schoolId?: string }) {
    return this.documentsService.getTemplates(request.schoolId!);
  }

  @Post('generate')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Generar y emitir un documento para un alumno' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        fileUrl: { type: 'string' },
        documentType: { type: 'string' }
      }
    }
  })
  async generateDocument(
    @Body() dto: GenerateDocumentDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    const result = await this.documentsService.issueDocument(dto, request.schoolId!, user.sub);
    return {
      id: result.document.id,
      title: result.document.title,
      fileUrl: result.document.fileUrl,
      documentType: result.document.documentType
    };
  }

  @Get('student/:studentId/history')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Consultar historial documental de un alumno' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiOkResponse({ type: IssuedDocument, isArray: true })
  getDocumentHistory(@Param('studentId') studentId: string, @Req() request: { schoolId?: string }) {
    return this.documentsService.getDocumentHistory(studentId, request.schoolId!);
  }
}
