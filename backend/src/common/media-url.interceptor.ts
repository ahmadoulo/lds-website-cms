import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

/**
 * Media rows are stored in PostgreSQL with only their metadata (bucket + storageKey);
 * the binary lives in MinIO. Browsers must never talk to MinIO directly (it is on a
 * private Docker network in production), so every media object leaving the API is
 * decorated with an absolute `url` pointing at our own streaming endpoint.
 *
 * Doing this in one interceptor keeps every service free of URL-building concerns and
 * guarantees no endpoint can forget it.
 */
@Injectable()
export class MediaUrlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const base = resolvePublicApiUrl(request);

    return next.handle().pipe(map((data) => decorate(data, base)));
  }
}

export function resolvePublicApiUrl(request?: Request): string {
  const configured = process.env.PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (request) {
    const forwardedProto = firstHeaderValue(request.headers['x-forwarded-proto']);
    const forwardedHost = firstHeaderValue(request.headers['x-forwarded-host']);
    const protocol = forwardedProto || request.protocol || 'http';
    const host = forwardedHost || request.get?.('host');
    if (host) return `${protocol}://${host}`;
  }

  return '';
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(',')[0]?.trim() || undefined;
}

export function buildMediaUrl(base: string, mediaId: string): string {
  const prefix = base ? `${base}` : '';
  return `${prefix}/api/v1/media/${mediaId}/file`;
}

const MAX_DEPTH = 8;

function decorate(value: any, base: string, depth = 0): any {
  if (value === null || value === undefined || depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((item) => decorate(item, base, depth + 1));
  }

  // Dates, buffers and streams must pass through untouched.
  if (typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  const isMedia =
    typeof value.id === 'string' &&
    typeof value.storageKey === 'string' &&
    typeof value.bucket === 'string';

  const result: Record<string, any> = isMedia ? { ...value, url: buildMediaUrl(base, value.id) } : { ...value };

  for (const key of Object.keys(result)) {
    if (key === 'url') continue;
    result[key] = decorate(result[key], base, depth + 1);
  }

  return result;
}
