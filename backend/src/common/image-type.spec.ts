import { detectImageType } from './image-type';

const pad = (head: number[], length = 32) =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(Math.max(0, length - head.length))]);

describe('detectImageType', () => {
  it('recognises PNG', () => {
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({
      mime: 'image/png',
      extension: '.png',
      supportsDimensions: true,
    });
  });

  it('recognises JPEG', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg');
  });

  it('recognises GIF', () => {
    expect(detectImageType(pad([...Buffer.from('GIF89a')]))?.mime).toBe('image/gif');
  });

  it('recognises WebP', () => {
    const buffer = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.alloc(4),
      Buffer.from('WEBP'),
      Buffer.alloc(20),
    ]);
    expect(detectImageType(buffer)?.mime).toBe('image/webp');
  });

  it('recognises AVIF', () => {
    const buffer = Buffer.concat([
      Buffer.alloc(4),
      Buffer.from('ftyp'),
      Buffer.from('avif'),
      Buffer.alloc(20),
    ]);
    expect(detectImageType(buffer)?.mime).toBe('image/avif');
  });

  it('recognises ICO and marks it as having no single size', () => {
    const detected = detectImageType(pad([0x00, 0x00, 0x01, 0x00]));

    expect(detected?.mime).toBe('image/x-icon');
    expect(detected?.extension).toBe('.ico');
    // An .ico bundles several sizes, so there is nothing to record.
    expect(detected?.supportsDimensions).toBe(false);
  });

  it('rejects SVG, which can carry script', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });

  it('rejects a script renamed with an image extension', () => {
    expect(detectImageType(Buffer.from('#!/bin/sh\nrm -rf /\n'.padEnd(32)))).toBeNull();
  });

  it('rejects a PDF', () => {
    expect(detectImageType(pad([...Buffer.from('%PDF-1.7')]))).toBeNull();
  });

  it('rejects a buffer too short to identify', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });

  it('rejects an empty buffer', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
