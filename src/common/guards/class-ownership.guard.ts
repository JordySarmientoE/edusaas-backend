import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ClassesService } from '../../classes/classes.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class ClassOwnershipGuard implements CanActivate {
  constructor(private readonly classesService: ClassesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string | undefined>;
      body?: { classId?: string };
      user?: JwtPayload;
      schoolId?: string | null;
    }>();
    const classId = request.params?.classId ?? request.params?.id ?? request.body?.classId;

    if (!classId || !request.user || !request.schoolId) {
      throw new NotFoundException('No se pudo resolver la clase solicitada');
    }

    const ownsClass = await this.classesService.teacherOwnsClass(
      classId,
      request.user.sub,
      request.schoolId
    );

    if (!ownsClass) {
      throw new ForbiddenException('El profesor no está asignado a esta clase');
    }

    return true;
  }
}
