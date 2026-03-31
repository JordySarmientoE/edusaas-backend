import { Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SchoolConfig } from './entities/school-config.entity';
import { LogoUploadResponseDto } from './dto/logo-upload-response.dto';
import { UpdateSchoolConfigDto } from './dto/update-school-config.dto';
import { SchoolConfigService } from './school-config.service';

@Controller()
@ApiTags('School Config')
@ApiBearerAuth('access-token')
export class SchoolConfigController {
  constructor(private readonly schoolConfigService: SchoolConfigService) {}

  @Get('school-config')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Obtener la configuracion del colegio autenticado' })
  @ApiOkResponse({ type: SchoolConfig })
  getConfig(@Req() request: { schoolId?: string }) {
    return this.schoolConfigService.getConfig(request.schoolId!);
  }

  @Patch('school-config')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Actualizar la configuracion del colegio autenticado' })
  @ApiOkResponse({ type: SchoolConfig })
  updateConfig(@Req() request: { schoolId?: string }, @Body() dto: UpdateSchoolConfigDto) {
    return this.schoolConfigService.updateConfig(request.schoolId!, dto);
  }

  @Post('school-config/logo')
  @Roles(Role.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir o reemplazar el logo del colegio autenticado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        }
      },
      required: ['file']
    }
  })
  @ApiOkResponse({ type: LogoUploadResponseDto })
  async uploadLogo(
    @Req() request: { schoolId?: string },
    @UploadedFile() file?: { originalname: string; buffer: Buffer }
  ) {
    const logoUrl = await this.schoolConfigService.uploadLogo(request.schoolId!, file);
    return { logoUrl };
  }

  @Get('schools/:schoolId/config')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener la configuracion de un colegio por id' })
  @ApiParam({ name: 'schoolId', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: SchoolConfig })
  getConfigBySchool(@Param('schoolId') schoolId: string) {
    return this.schoolConfigService.getConfig(schoolId);
  }

  @Patch('schools/:schoolId/config')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar la configuracion de un colegio por id' })
  @ApiParam({ name: 'schoolId', description: 'Identificador unico del colegio' })
  @ApiOkResponse({ type: SchoolConfig })
  updateConfigBySchool(@Param('schoolId') schoolId: string, @Body() dto: UpdateSchoolConfigDto) {
    return this.schoolConfigService.updateConfig(schoolId, dto);
  }

  @Post('schools/:schoolId/config/logo')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir o reemplazar el logo de un colegio por id' })
  @ApiParam({ name: 'schoolId', description: 'Identificador unico del colegio' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        }
      },
      required: ['file']
    }
  })
  @ApiOkResponse({ type: LogoUploadResponseDto })
  async uploadLogoBySchool(
    @Param('schoolId') schoolId: string,
    @UploadedFile() file?: { originalname: string; buffer: Buffer }
  ) {
    const logoUrl = await this.schoolConfigService.uploadLogo(schoolId, file);
    return { logoUrl };
  }
}
