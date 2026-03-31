import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type TenantRequest = {
  user?: JwtPayload;
  params?: Record<string, string | undefined>;
  schoolId?: string | null;
};

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (user.role === Role.SUPER_ADMIN) {
      request.schoolId = request.params?.schoolId ?? null;
      return true;
    }

    if (!user.schoolId) {
      throw new ForbiddenException('No se encontró el colegio del usuario autenticado');
    }

    request.schoolId = user.schoolId;
    return true;
  }
}
