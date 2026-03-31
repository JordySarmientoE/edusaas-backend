import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/services/storage.service';
import { SchoolsService } from '../schools/schools.service';
import { UpdateSchoolConfigDto } from './dto/update-school-config.dto';
import { GradeScale, SchoolConfig } from './entities/school-config.entity';
import { SchoolConfigsRepository } from './repositories';

type UploadFile = {
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class SchoolConfigService {
  constructor(
    private readonly configRepository: SchoolConfigsRepository,
    private readonly schoolsService: SchoolsService,
    private readonly storageService: StorageService
  ) {}

  async getConfig(schoolId: string): Promise<SchoolConfig> {
    await this.schoolsService.findById(schoolId);
    const existing = await this.configRepository.findOne({ where: { schoolId } });

    if (existing) {
      return existing;
    }

    const config = this.configRepository.create({
      schoolId,
      logoUrl: null,
      primaryColor: '28 126 214',
      secondaryColor: '14 165 233',
      principalName: null,
      gradingScale: GradeScale.NUMERIC_20,
      schoolRules: ''
    });

    return this.configRepository.save(config);
  }

  async updateConfig(schoolId: string, dto: UpdateSchoolConfigDto): Promise<SchoolConfig> {
    const config = await this.getConfig(schoolId);
    Object.assign(config, dto);
    return this.configRepository.save(config);
  }

  async uploadLogo(schoolId: string, file?: UploadFile): Promise<string> {
    if (!file) {
      throw new NotFoundException('No se recibió ningún archivo');
    }

    const config = await this.getConfig(schoolId);
    const logoUrl = await this.storageService.storeSchoolLogo(file);
    config.logoUrl = logoUrl;
    await this.configRepository.save(config);
    return logoUrl;
  }
}
