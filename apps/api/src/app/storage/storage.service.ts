import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

export const STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const STORAGE_ALLOWED_MIME_PATTERN = /^image\/(jpeg|png|webp)$/;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private ready = false;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'ecard-files';
    this.publicUrl = (
      process.env.MINIO_PUBLIC_URL ?? 'https://localhost:9000'
    ).replace(/\/$/, '');
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://minio:9000';
    try {
      const url = new URL(endpoint);
      this.client = new Minio.Client({
        endPoint: url.hostname,
        port: parseInt(
          url.port || (url.protocol === 'https:' ? '443' : '9000'),
        ),
        useSSL: url.protocol === 'https:',
        accessKey: process.env.MINIO_ROOT_USER ?? 'minio',
        secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minio123',
      });
    } catch (err: unknown) {
      this.logger.warn(
        `MinIO client init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(this.bucket, policy);
      }
      this.ready = true;
      this.logger.log(`Storage ready — bucket: "${this.bucket}"`);
    } catch (err: unknown) {
      this.logger.warn(
        `MinIO init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.client || !this.ready) {
      throw new Error('Storage service is not available');
    }
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async remove(key: string): Promise<void> {
    if (!this.client || !this.ready) return;
    try {
      await this.client.removeObject(this.bucket, key);
    } catch {
      // ignore — object may not exist
    }
  }

  /**
   * Download an object's bytes by storage URL (as returned by {@link upload})
   * or raw object key. Returns null when the URL is outside the bucket, the
   * object is missing, or the client is unavailable.
   */
  async download(urlOrKey: string): Promise<Buffer | null> {
    if (!this.client || !this.ready) return null;
    let key = urlOrKey;
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (urlOrKey.startsWith(prefix)) {
      key = urlOrKey.slice(prefix.length);
    } else if (/^https?:\/\//.test(urlOrKey)) {
      // URL belongs to a different host — can't fetch via this client.
      return null;
    }
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }
}
