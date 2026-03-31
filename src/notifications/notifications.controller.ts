import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario autenticado' })
  @ApiOkResponse({ type: Notification, isArray: true })
  getMyNotifications(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.notificationsService.getByUser(user.sub, request.schoolId!);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificacion como leida' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la notificacion' })
  @ApiOkResponse({ type: MessageResponseDto })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAsRead(id, user.sub);
    return { message: 'Notificación marcada como leída' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leidas' })
  @ApiOkResponse({ type: MessageResponseDto })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { message: 'Notificaciones marcadas como leídas' };
  }
}
