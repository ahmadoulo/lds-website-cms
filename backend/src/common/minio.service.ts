import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import type { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  readonly bucketName = process.env.MINIO_BUCKET || 'lds-media';

  async onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, process.env.MINIO_REGION || 'us-east-1');
        this.logger.log(`Created MinIO bucket "${this.bucketName}"`);
      }
      // The bucket stays private: files are served through the API
      // (GET /api/v1/media/:id/file), so MinIO is never exposed to the internet.
    } catch (err) {
      this.logger.error(`Error initializing MinIO bucket: ${err}`);
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string, size: number): Promise<void> {
    try {
      await this.minioClient.putObject(this.bucketName, key, buffer, size, {
        'Content-Type': mimeType,
      });
    } catch (error) {
      this.logger.error(`Failed to upload "${key}": ${error}`);
      throw new InternalServerErrorException('Échec du téléversement du fichier');
    }
  }

  async getFileStream(key: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(this.bucketName, key);
    } catch (error) {
      this.logger.error(`Failed to read "${key}": ${error}`);
      throw new InternalServerErrorException('Fichier introuvable dans le stockage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, key);
    } catch (error) {
      // A missing object should not block deleting the database row.
      this.logger.warn(`Failed to delete "${key}" from storage: ${error}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.minioClient.bucketExists(this.bucketName);
    } catch {
      return false;
    }
  }
}
