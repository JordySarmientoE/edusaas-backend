import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditService } from '../audit.service';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  it('logs write operations asynchronously', (done) => {
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined)
    } as unknown as AuditService;
    const interceptor = new AuditInterceptor(auditService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/audit-logs',
          route: { path: 'audit-logs' },
          params: { id: 'entity-1' },
          user: {
            sub: 'user-1',
            email: 'admin@example.com',
            role: 'school_admin',
            schoolId: 'school-1'
          },
          schoolId: 'school-1'
        })
      })
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true })
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      next: () => undefined,
      complete: () => {
        setImmediate(() => {
          expect((auditService.log as jest.Mock).mock.calls[0][0]).toMatchObject({
            userId: 'user-1',
            entityType: 'audit-logs',
            entityId: 'entity-1',
            schoolId: 'school-1'
          });
          done();
        });
      }
    });
  });

  it('skips read-only requests', (done) => {
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined)
    } as unknown as AuditService;
    const interceptor = new AuditInterceptor(auditService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/health'
        })
      })
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true })
    } as CallHandler;

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      }
    });
  });
});
