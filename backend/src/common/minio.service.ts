import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
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
        await this.minioClient.makeBucket(
          this.bucketName,
          process.env.MINIO_REGION || 'us-east-1',
        );
        this.logger.log(`Created MinIO bucket "${this.bucketName}"`);
      }
      // The bucket stays private: files are served through the API
      // (GET /api/v1/media/:id/file), so MinIO is never exposed to the internet.
    } catch (err) {
      this.logger.error(`Error initializing MinIO bucket: ${err}`);
    }
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    size: number,
  ): Promise<void> {
    try {
      await this.minioClient.putObject(this.bucketName, key, buffer, size, {
        'Content-Type': mimeType,
      });
    } catch (error) {
      this.logger.error(`Failed to upload "${key}": ${error}`);
      throw new InternalServerErrorException(
        'Échec du téléversement du fichier',
      );
    }
  }

  async getFileStream(key: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(this.bucketName, key);
    } catch (error) {
      this.logger.error(`Failed to read "${key}": ${error}`);
      throw new InternalServerErrorException(
        'Fichier introuvable dans le stockage',
      );
    }
  }

  /**
   * The whole object in memory.
   *
   * Only for the image pipeline, which has to hand a complete buffer to sharp
   * and cannot work on a stream. Uploads are capped at 5 MB, so the ceiling is
   * known; everything else reads through `getFileStream`.
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    const stream = await this.getFileStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string),
      );
    }
    return Buffer.concat(chunks);
  }

  /**
   * Whether an object is there, without reading it.
   *
   * Distinguishes "not generated yet" from a storage failure: the first is
   * normal and means build it, the second must not be silently swallowed into
   * regenerating an image on every single request.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, key);
      return true;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'NotFound' || code === 'NoSuchKey') return false;
      this.logger.warn(`Could not stat "${key}": ${error}`);
      return false;
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
