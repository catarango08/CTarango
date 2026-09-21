import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { applyDerived, syncJobPhotoFlag } from '@/lib/domain/writes';
import { MAX_UPLOAD_BYTES } from '@/lib/notion/files';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACCEPTED = /^image\/(jpeg|png|gif|webp|heic|heif|avif)$/i;

/**
 * Multipart upload straight from the field: the photo goes into Notion's file
 * storage and a Job Photos row is created with the job, stage and caption.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const files = form.getAll('file').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const store = getStore();
  const jobId = str(form.get('job'));
  const takenById = str(form.get('takenBy'));
  const stage = str(form.get('stage')) || 'During';
  const captionBase = str(form.get('caption'));
  const location = str(form.get('location'));
  const notes = str(form.get('notes'));
  const customerOk = str(form.get('customerOk')) === 'true';

  const created = [];
  const failed: { name: string; reason: string }[] = [];

  for (const [index, file] of files.entries()) {
    if (!ACCEPTED.test(file.type)) {
      failed.push({ name: file.name, reason: `Unsupported type ${file.type || 'unknown'}` });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      failed.push({ name: file.name, reason: `${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 20 MB limit` });
      continue;
    }

    try {
      const uploaded = await store.upload({
        name: file.name,
        contentType: file.type,
        data: await file.arrayBuffer(),
      });

      const caption = captionBase
        ? files.length > 1
          ? `${captionBase} (${index + 1})`
          : captionBase
        : file.name.replace(/\.[^.]+$/, '');

      const values = await applyDerived('jobPhotos', {
        caption,
        file: [uploaded],
        stage,
        takenAt: new Date().toISOString(),
        ...(jobId ? { job: [{ id: jobId }] } : {}),
        ...(location ? { location } : {}),
        ...(notes ? { notes } : {}),
        customerOk,
      });

      created.push(await store.create('jobPhotos', values));
    } catch (err) {
      failed.push({ name: file.name, reason: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  // The Photos checkbox drives his Notion views, so keep it true to the photos.
  if (created.length && jobId) {
    try {
      await syncJobPhotoFlag(jobId);
    } catch {
      // A stale checkbox is not worth failing the upload over.
    }
  }

  const status = created.length ? (failed.length ? 207 : 201) : 502;
  return NextResponse.json({ created, failed }, { status });
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}
