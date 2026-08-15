import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName = process.env.MINIO_BUCKET || 'lds-media';

  async onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        
        // Make bucket public read-only to avoid generating signed URLs for public CMS content
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }
    } catch (err) {
      console.error('Error initializing MinIO bucket:', err);
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string, size: number): Promise<{ url: string }> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        key,
        buffer,
        size,
        { 'Content-Type': mimeType }
      );
      
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      
      return {
        url: `${protocol}://${endpoint}${port}/${this.bucketName}/${key}`
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, key);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }
}
