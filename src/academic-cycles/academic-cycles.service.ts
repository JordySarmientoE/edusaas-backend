import { ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchoolClass } from '../classes/entities/class.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { SchoolsService } from '../schools/schools.service';
import { ConfigureGradeCourseDto } from './dto/configure-grade-course.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateGradeCourseConfigDto } from './dto/update-grade-course-config.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { AcademicCycle } from './entities/academic-cycle.entity';
import { Course } from './entities/course.entity';
import { GradeCourseConfig } from './entities/grade-course-config.entity';
import { Grade } from './entities/grade.entity';
import { Section } from './entities/section.entity';
import {
  AcademicCoursesRepository,
  AcademicCyclesRepository,
  AcademicGradesRepository,
  AcademicSectionsRepository,
  GradeCourseConfigsRepository
} from './repositories';

@Injectable()
export class AcademicCyclesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cyclesRepository: AcademicCyclesRepository,
    private readonly gradesRepository: AcademicGradesRepository,
    private readonly sectionsRepository: AcademicSectionsRepository,
    private readonly coursesRepository: AcademicCoursesRepository,
    private readonly gradeCourseConfigsRepository: GradeCourseConfigsRepository,
    @Inject(forwardRef(() => SchoolsService))
    private readonly schoolsService: SchoolsService
  ) {}

  async createCycle(dto: CreateCycleDto, schoolId: string): Promise<AcademicCycle> {
    await this.schoolsService.findById(schoolId);
    const existing = await this.cyclesRepository.findOne({ where: { schoolId, name: dto.name } });
    if (existing) {
      throw new ConflictException('Ya existe un ciclo con ese nombre');
    }

    const cycle = this.cyclesRepository.create({
      schoolId,
      name: dto.name,
      year: dto.year,
      term: dto.term ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      isClosed: false
    });
    return this.cyclesRepository.save(cycle);
  }

  async findAll(schoolId: string): Promise<AcademicCycle[]> {
    return this.cyclesRepository.find({ where: { schoolId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, schoolId: string): Promise<AcademicCycle> {
    const cycle = await this.cyclesRepository.findOne({ where: { id, schoolId } });
    if (!cycle) {
      throw new NotFoundException('Ciclo académico no encontrado');
    }
    return cycle;
  }

  async updateCycle(id: string, dto: UpdateCycleDto, schoolId: string): Promise<AcademicCycle> {
    const cycle = await this.findById(id, schoolId);
    Object.assign(cycle, dto);
    return this.cyclesRepository.save(cycle);
  }

  async closeCycle(id: string, schoolId: string): Promise<void> {
    const cycle = await this.findById(id, schoolId);
    cycle.isClosed = true;
    await this.cyclesRepository.save(cycle);
  }

  async reopenCycle(id: string, schoolId: string): Promise<void> {
    const cycle = await this.findById(id, schoolId);
    cycle.isClosed = false;
    await this.cyclesRepository.save(cycle);
  }

  async deleteCycle(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);

    const [sectionsCount, classesCount, enrollmentsCount, gradesCount] = await Promise.all([
      this.sectionsRepository.count({ where: { schoolId, cycleId: id } }),
      this.dataSource.getRepository(SchoolClass).count({ where: { schoolId, cycleId: id } }),
      this.dataSource.getRepository(Enrollment).count({ where: { schoolId, cycleId: id } }),
      this.dataSource.getRepository(GradeRecord).count({ where: { schoolId, cycleId: id } })
    ]);

    if (sectionsCount > 0 || classesCount > 0 || enrollmentsCount > 0 || gradesCount > 0) {
      throw new ConflictException('No se puede eliminar el ciclo porque ya tiene información relacionada');
    }

    await this.cyclesRepository.delete({ id, schoolId });
  }

  async createGrade(dto: CreateGradeDto, schoolId: string): Promise<Grade> {
    const existing = await this.gradesRepository.findOne({
      where: { schoolId, name: dto.name, level: dto.level }
    });
    if (existing) {
      throw new ConflictException('Ya existe un grado con ese nombre en el nivel indicado');
    }

    const grade = this.gradesRepository.create({
      schoolId,
      name: dto.name,
      level: dto.level,
      order: dto.order,
      description: dto.description ?? null,
      isActive: true
    });
    return this.gradesRepository.save(grade);
  }

  async updateGrade(id: string, dto: UpdateGradeDto, schoolId: string): Promise<Grade> {
    const grade = await this.findGradeById(id, schoolId);
    Object.assign(grade, dto);
    return this.gradesRepository.save(grade);
  }

  async findAllGrades(schoolId: string): Promise<Grade[]> {
    return this.gradesRepository.find({ where: { schoolId }, order: { level: 'ASC', order: 'ASC', name: 'ASC' } });
  }

  async findGradeById(id: string, schoolId: string): Promise<Grade> {
    const grade = await this.gradesRepository.findOne({ where: { id, schoolId } });
    if (!grade) {
      throw new NotFoundException('Grado no encontrado');
    }
    return grade;
  }

  async createCourse(dto: CreateCourseDto, schoolId: string): Promise<Course> {
    const existing = await this.coursesRepository.findOne({ where: { schoolId, name: dto.name } });
    if (existing) {
      throw new ConflictException('Ya existe un curso con ese nombre');
    }

    const course = this.coursesRepository.create({
      schoolId,
      name: dto.name,
      code: dto.code ?? null,
      area: dto.area ?? null,
      isActive: true
    });
    return this.coursesRepository.save(course);
  }

  async findAllCourses(schoolId: string): Promise<Course[]> {
    return this.coursesRepository.find({ where: { schoolId }, order: { area: 'ASC', name: 'ASC' } });
  }

  async findCourseById(id: string, schoolId: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id, schoolId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }
    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto, schoolId: string): Promise<Course> {
    const course = await this.findCourseById(id, schoolId);
    Object.assign(course, dto);
    return this.coursesRepository.save(course);
  }

  async configureGradeCourse(gradeId: string, dto: ConfigureGradeCourseDto, schoolId: string): Promise<GradeCourseConfig> {
    await this.findGradeById(gradeId, schoolId);
    await this.findCourseById(dto.courseId, schoolId);

    const existing = await this.gradeCourseConfigsRepository.findOne({
      where: { schoolId, gradeId, courseId: dto.courseId }
    });

    if (existing) {
      existing.isRequired = dto.isRequired ?? existing.isRequired;
      existing.weeklyHours = dto.weeklyHours ?? existing.weeklyHours;
      existing.order = dto.order ?? existing.order;
      existing.isActive = true;
      return this.gradeCourseConfigsRepository.save(existing);
    }

    const config = this.gradeCourseConfigsRepository.create({
      schoolId,
      gradeId,
      courseId: dto.courseId,
      isRequired: dto.isRequired ?? true,
      weeklyHours: dto.weeklyHours ?? null,
      order: dto.order ?? 1,
      isActive: true
    });

    return this.gradeCourseConfigsRepository.save(config);
  }

  async findGradeCourseConfigs(gradeId: string, schoolId: string): Promise<GradeCourseConfig[]> {
    await this.findGradeById(gradeId, schoolId);
    return this.gradeCourseConfigsRepository.find({
      where: { schoolId, gradeId },
      relations: { course: true },
      order: { order: 'ASC', createdAt: 'ASC' }
    });
  }

  async updateGradeCourseConfig(id: string, dto: UpdateGradeCourseConfigDto, schoolId: string): Promise<GradeCourseConfig> {
    const config = await this.gradeCourseConfigsRepository.findOne({
      where: { id, schoolId },
      relations: { course: true, grade: true }
    });

    if (!config) {
      throw new NotFoundException('Configuración de curso por grado no encontrada');
    }

    Object.assign(config, dto);
    return this.gradeCourseConfigsRepository.save(config);
  }

  async createSection(cycleId: string, dto: CreateSectionDto, schoolId: string): Promise<Section> {
    await this.findById(cycleId, schoolId);
    await this.findGradeById(dto.gradeId, schoolId);
    const existing = await this.sectionsRepository.findOne({
      where: { schoolId, cycleId, gradeId: dto.gradeId, name: dto.name }
    });
    if (existing) {
      throw new ConflictException('Ya existe una sección con ese nombre para ese grado en el ciclo');
    }

    const section = this.sectionsRepository.create({
      schoolId,
      cycleId,
      gradeId: dto.gradeId,
      name: dto.name,
      capacity: dto.capacity ?? null,
      isActive: true
    });
    return this.sectionsRepository.save(section);
  }

  async updateSection(id: string, dto: UpdateSectionDto, schoolId: string): Promise<Section> {
    const section = await this.findSectionById(id, schoolId);
    Object.assign(section, dto);
    return this.sectionsRepository.save(section);
  }

  async findSectionsByCycle(cycleId: string, schoolId: string, gradeId?: string): Promise<Section[]> {
    await this.findById(cycleId, schoolId);
    if (gradeId) {
      await this.findGradeById(gradeId, schoolId);
    }

    return this.sectionsRepository.find({
      where: {
        cycleId,
        schoolId,
        ...(gradeId ? { gradeId } : {})
      },
      relations: {
        grade: true,
        cycle: true
      },
      order: { name: 'ASC' }
    });
  }

  async findSectionById(id: string, schoolId: string): Promise<Section> {
    const section = await this.sectionsRepository.findOne({ where: { id, schoolId } });
    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }
    return section;
  }

  async findSectionStructure(id: string, schoolId: string): Promise<{ section: Section; grade: Grade; cycle: AcademicCycle }> {
    const section = await this.findSectionById(id, schoolId);
    const grade = await this.findGradeById(section.gradeId, schoolId);
    const cycle = await this.findById(section.cycleId, schoolId);
    return { section, grade, cycle };
  }
}
