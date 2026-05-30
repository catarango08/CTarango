import { useRef, useState } from 'react';
import { Upload, Trash2, ExternalLink, ImageIcon, Loader2 } from 'lucide-react';
import type { Job, Photo } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as drive from '../lib/drive';

interface Props {
  job: Job;
  googleClientId: string;
  driveConnected: boolean;
  onAddPhoto: (photo: Photo) => void;
  onUpdatePhoto: (id: string, changes: Partial<Photo>) => void;
  onRemovePhoto: (id: string) => void;
}

function resizeImage(file: File, maxWidth = 1200): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ dataUrl, sizeBytes: Math.round(dataUrl.length * 0.75) });
    };
    img.src = url;
  });
}

export default function PhotosTab({
  job,
  googleClientId,
  driveConnected,
  onAddPhoto,
  onUpdatePhoto,
  onRemovePhoto,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  async function handleFiles(files: FileList) {
    setError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        if (driveConnected && googleClientId) {
          // Upload to Drive
          const { fileId, webViewLink, thumbnailLink } = await drive.uploadPhoto(
            googleClientId,
            job.id,
            file
          );
          onAddPhoto({
            id: uuidv4(),
            name: file.name,
            driveFileId: fileId,
            driveWebViewLink: webViewLink,
            driveThumbnailLink: thumbnailLink,
            uploadedAt: new Date().toISOString(),
            sizeBytes: file.size,
            caption: '',
          });
        } else {
          // Store locally as base64
          const { dataUrl, sizeBytes } = await resizeImage(file);
          onAddPhoto({
            id: uuidv4(),
            name: file.name,
            dataUrl,
            uploadedAt: new Date().toISOString(),
            sizeBytes,
            caption: '',
          });
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  async function handleDelete(photo: Photo) {
    if (photo.driveFileId && googleClientId) {
      try {
        await drive.deleteFile(googleClientId, photo.driveFileId);
      } catch {
        /* ignore if already deleted */
      }
    }
    onRemovePhoto(photo.id);
  }

  const totalMB = job.photos.reduce((s, p) => s + p.sizeBytes, 0) / 1024 / 1024;

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm font-medium">Uploading{driveConnected ? ' to Google Drive' : ''}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload size={28} />
            <p className="text-sm font-medium text-slate-600">Click or drag photos here</p>
            <p className="text-xs">
              {driveConnected
                ? 'Photos will be uploaded to your Google Drive'
                : 'Photos stored locally (connect Drive to upload to cloud)'}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {!driveConnected && totalMB > 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          Local photo storage is {totalMB.toFixed(1)} MB. Connect Google Drive to avoid storage limits.
        </div>
      )}

      {/* Photo grid */}
      {job.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {job.photos.map(photo => {
            const src = photo.driveThumbnailLink ?? photo.dataUrl;
            return (
              <div key={photo.id} className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="aspect-square bg-slate-100 cursor-pointer overflow-hidden"
                  onClick={() => setLightbox(photo)}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={photo.caption || photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={32} />
                    </div>
                  )}
                </div>
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.driveWebViewLink && (
                    <a
                      href={photo.driveWebViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white rounded-md p-1 shadow text-slate-500 hover:text-blue-600"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(photo); }}
                    className="bg-white rounded-md p-1 shadow text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="p-2">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={e => onUpdatePhoto(photo.id, { caption: e.target.value })}
                    placeholder="Caption…"
                    className="w-full text-xs border-0 focus:outline-none text-slate-600 placeholder-slate-300 bg-transparent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {job.photos.length === 0 && !uploading && (
        <div className="text-center py-4 text-slate-400 text-sm">
          No photos yet. Upload images to document the job site.
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.driveWebViewLink ? `https://drive.google.com/uc?id=${lightbox.driveFileId}` : lightbox.dataUrl}
              alt={lightbox.caption || lightbox.name}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              onError={e => {
                // fallback to thumbnail if direct URL fails
                (e.target as HTMLImageElement).src = lightbox.driveThumbnailLink ?? lightbox.dataUrl ?? '';
              }}
            />
            {lightbox.caption && (
              <p className="text-white text-center mt-2 text-sm">{lightbox.caption}</p>
            )}
            {lightbox.driveWebViewLink && (
              <div className="text-center mt-2">
                <a
                  href={lightbox.driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 text-xs hover:underline"
                >
                  Open in Google Drive
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
