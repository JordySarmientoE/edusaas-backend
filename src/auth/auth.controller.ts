import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiTooManyRequestsResponse
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { CompleteLoginContextDto } from './dto/complete-login-context.dto';
import { ContextSwitchResponseDto } from './dto/context-switch-response.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectContextDto } from './dto/select-context.dto';
import { TokenPairDto } from './dto/token-pair.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar sesion con correo y contrasena' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ type: LoginResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Se excedio el limite de intentos de inicio de sesion' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar una cuenta global en la plataforma' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: LoginResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('context')
  @ApiOperation({ summary: 'Completar el login seleccionando la membresia activa' })
  @ApiBody({ type: CompleteLoginContextDto })
  @ApiOkResponse({ type: ContextSwitchResponseDto })
  completeLoginContext(@Body() dto: CompleteLoginContextDto) {
    return this.authService.completeLoginContext(dto.contextToken, dto.membershipId);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cerrar la sesion del usuario autenticado' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token invalido o ausente' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Post('context/switch')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cambiar el contexto activo del usuario a otra membresia de colegio' })
  @ApiBody({ type: SelectContextDto })
  @ApiOkResponse({ type: ContextSwitchResponseDto })
  switchContext(@CurrentUser() user: JwtPayload, @Body() dto: SelectContextDto) {
    return this.authService.switchContext(user.sub, dto.membershipId);
  }
}
