import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

type UploadFile = {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
};

export type StoredFile = {
  url: string;
  key: string;
  name: string;
  mimeType: string | null;
  provider: 'local' | 'cloudinary';
};

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });
    }
  }

  private get provider() {
    return this.configService.get<'local' | 'cloudinary'>('STORAGE_PROVIDER') ?? 'local';
  }

  async storeAttachment(file: UploadFile, scope: 'tasks' | 'announcements'): Promise<StoredFile> {
    return this.storeFile(file, scope);
  }

  async storeSchoolLogo(file: UploadFile): Promise<string> {
    const result = await this.storeFile(file, 'logos');
    return result.url;
  }

  async storeUserAvatar(file: UploadFile): Promise<string> {
    const result = await this.storeFile(file, 'avatars');
    return result.url;
  }

  async storeIssuedDocument(buffer: Buffer, title: string): Promise<string> {
    const file: UploadFile = {
      originalname: `${title}.pdf`,
      buffer,
      mimetype: 'application/pdf'
    };
    const result = await this.storeFile(file, 'documents', title);
    return result.url;
  }

  private async storeFile(file: UploadFile, scope: string, preferredName?: string): Promise<StoredFile> {
    if (this.provider === 'cloudinary' && this.hasCloudinaryConfig()) {
      return this.storeCloudinaryFile(file, scope, preferredName);
    }

    return this.storeLocalFile(file, scope, preferredName);
  }

  private hasCloudinaryConfig(): boolean {
    return Boolean(
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') &&
        this.configService.get<string>('CLOUDINARY_API_KEY') &&
        this.configService.get<string>('CLOUDINARY_API_SECRET')
    );
  }

  private async storeLocalFile(file: UploadFile, scope: string, preferredName?: string): Promise<StoredFile> {
    const scopedDir = join(process.cwd(), 'uploads', scope);
    await mkdir(scopedDir, { recursive: true });

    const safeTitle = (preferredName || file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const extension = extname(file.originalname) || '.bin';
    const filename = `${safeTitle || scope}-${randomUUID()}${extension}`;
    const filepath = join(scopedDir, filename);

    await writeFile(filepath, file.buffer);

    return {
      url: `/uploads/${scope}/${filename}`,
      key: `${scope}/${filename}`,
      name: file.originalname,
      mimeType: file.mimetype ?? null,
      provider: 'local'
    };
  }

  private async storeCloudinaryFile(file: UploadFile, scope: string, preferredName?: string): Promise<StoredFile> {
    const folder = `EduSaaS/${scope}`;
    const publicIdBase = (preferredName || file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          public_id: `${publicIdBase || scope}-${randomUUID()}`
        },
        (error, value) => {
          if (error || !value) {
            reject(error instanceof Error ? error : new Error('No se pudo subir el archivo'));
            return;
          }

          resolve({
            secure_url: value.secure_url,
            public_id: value.public_id
          });
        }
      );

      upload.end(file.buffer);
    });

    return {
      url: result.secure_url,
      key: result.public_id,
      name: file.originalname,
      mimeType: file.mimetype ?? null,
      provider: 'cloudinary'
    };
  }
}
