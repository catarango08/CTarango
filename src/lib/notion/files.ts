import type { FileRef } from '../schema';
import { NotionClient } from './client';

interface FileUploadResponse {
  id: string;
  status: string;
  filename?: string;
  upload_url?: string;
}

/** Notion's single-part upload ceiling. Larger files need the multi-part flow. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Two-step Notion upload: reserve a file upload, then POST the bytes.
 * The returned ref can be handed straight to a `files` property.
 */
export async function uploadFile(
  client: NotionClient,
  file: { name: string; contentType: string; data: Buffer | ArrayBuffer | Uint8Array },
): Promise<FileRef> {
  const bytes = toUint8(file.data);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `"${file.name}" is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB. Notion single-part uploads cap at 20 MB — resize the photo before uploading.`,
    );
  }

  const created = await client.request<FileUploadResponse>('POST', '/file_uploads', {
    filename: file.name,
    content_type: file.contentType,
  });

  if (!created.upload_url) throw new Error('Notion did not return an upload URL for this file.');

  const form = new FormData();
  form.append('file', new Blob([toArrayBuffer(bytes)], { type: file.contentType }), file.name);
  const sent = await client.sendForm<FileUploadResponse>(created.upload_url, form);

  if (sent.status !== 'uploaded') {
    throw new Error(`Upload finished with unexpected status "${sent.status}".`);
  }

  return { name: file.name, url: '', uploadId: created.id };
}

function toUint8(data: Buffer | ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function isImage(contentType: string): boolean {
  return /^image\/(jpeg|png|gif|webp|heic|heif|avif)$/i.test(contentType);
}
