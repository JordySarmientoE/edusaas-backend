import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { Incident } from './entities/incident.entity';
import { IncidentsRepository } from './repositories';

@Injectable()
export class DisciplineService {
  constructor(
    private readonly incidentsRepository: IncidentsRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async createIncident(
    dto: CreateIncidentDto,
    schoolId: string,
    reportedById?: string
  ): Promise<Incident> {
    await this.usersService.findById(dto.studentId, schoolId);
    const incident = this.incidentsRepository.create({
      schoolId,
      studentId: dto.studentId,
      reportedById: reportedById ?? null,
      severity: dto.severity,
      description: dto.description
    });

    const savedIncident = await this.incidentsRepository.save(incident);
    this.eventEmitter.emit('incident.created', {
      schoolId,
      studentId: dto.studentId,
      incidentId: savedIncident.id,
      severity: savedIncident.severity,
      description: savedIncident.description
    });

    return savedIncident;
  }

  async getByStudent(studentId: string, schoolId: string): Promise<Incident[]> {
    await this.usersService.findById(studentId, schoolId);
    return this.incidentsRepository.find({
      where: { schoolId, studentId },
      relations: { student: true },
      order: { createdAt: 'DESC' }
    });
  }

  async getLinkedStudentsForParent(parentId: string, schoolId: string) {
    return this.usersService.getLinkedStudentsForParent(parentId, schoolId);
  }

  async updateIncident(id: string, dto: UpdateIncidentDto, schoolId: string): Promise<Incident> {
    const incident = await this.findById(id, schoolId);
    Object.assign(incident, dto);
    return this.incidentsRepository.save(incident);
  }

  async deleteIncident(id: string, schoolId: string): Promise<void> {
    const incident = await this.findById(id, schoolId);
    await this.incidentsRepository.remove(incident);
  }

  async findById(id: string, schoolId: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({ where: { id, schoolId } });
    if (!incident) {
      throw new NotFoundException('Incidente no encontrado');
    }
    return incident;
  }
}
