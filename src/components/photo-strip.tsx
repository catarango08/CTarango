import Link from 'next/link';
import type { RecordValue } from '@/lib/schema';
import { dateTime } from '@/lib/format';

function firstUrl(photo: RecordValue): string {
  const files = Array.isArray(photo.file) ? (photo.file as { url?: string }[]) : [];
  return files[0]?.url ?? '/api/placeholder/photo?label=No%20image&tone=slate';
}

export function PhotoTile({ photo, href }: { photo: RecordValue; href?: string }) {
  const body = (
    <figure className="group relative overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-2)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={firstUrl(photo)}
        alt={String(photo.caption ?? 'Job photo')}
        className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]"
        loading="lazy"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-white">{String(photo.caption ?? '')}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/60">
          {String(photo.stage ?? '')} · {dateTime(photo.takenAt)}
        </p>
      </figcaption>
    </figure>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function PhotoStrip({ photos, columns = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' }: { photos: RecordValue[]; columns?: string }) {
  if (!photos.length) {
    return <p className="text-sm text-[color:var(--muted)]">No photos yet. Every job should leave a before and an after.</p>;
  }
  return (
    <div className={`grid gap-2 ${columns}`}>
      {photos.map((photo) => {
        const jobId = Array.isArray(photo.job) && photo.job.length ? (photo.job as { id: string }[])[0].id : null;
        return <PhotoTile key={photo.id} photo={photo} href={jobId ? `/jobs/${jobId}` : undefined} />;
      })}
    </div>
  );
}
