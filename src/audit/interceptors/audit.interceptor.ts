import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuditService } from '../audit.service';

type AuditRequest = {
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
  params?: Record<string, string | undefined>;
  user?: JwtPayload;
  schoolId?: string | null;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const method = request.method ?? 'GET';

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService.log({
            userId: request.user?.sub ?? null,
            action: `${method} ${request.route?.path ?? request.originalUrl ?? 'unknown'}`,
            entityType: this.resolveEntityType(request),
            entityId: request.params?.id ?? null,
            schoolId: request.schoolId ?? request.user?.schoolId ?? null,
            metadata: {
              method,
              path: request.originalUrl ?? null
            }
          });
        }
      })
    );
  }

  private resolveEntityType(request: AuditRequest): string {
    const path = request.route?.path ?? request.originalUrl ?? 'unknown';
    return path
      .split('/')
      .filter(Boolean)[0]
      ?.replace(/[:?].*/, '') ?? 'unknown';
  }
}
