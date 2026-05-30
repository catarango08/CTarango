// Google Drive v3 REST API integration using Google Identity Services (GIS)
// Requires a Client ID from Google Cloud Console with Drive API enabled.

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'ElectricPro';

let tokenClient: { requestAccessToken: (o: { prompt: string }) => void } | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;
let folderId: string | null = null;

type GisTokenResponse = { access_token: string; expires_in: number; error?: string };

function loadGIS(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

export function isConnected(): boolean {
  return !!accessToken && Date.now() < tokenExpiry;
}

export function disconnect(): void {
  if (accessToken) {
    (window as any).google?.accounts?.oauth2?.revoke(accessToken);
  }
  accessToken = null;
  tokenExpiry = 0;
  folderId = null;
  tokenClient = null;
}

export async function connect(clientId: string): Promise<void> {
  await loadGIS();
  return new Promise<void>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: GisTokenResponse) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + resp.expires_in * 1000;
        folderId = null; // reset so folder is re-discovered
        resolve();
      },
    });
    tokenClient = client;
    client.requestAccessToken({ prompt: '' });
  });
}

async function refreshIfNeeded(clientId: string): Promise<void> {
  if (isConnected()) return;
  if (!tokenClient) await connect(clientId);
  return new Promise<void>((resolve, reject) => {
    (tokenClient as any).callback = (resp: GisTokenResponse) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + resp.expires_in * 1000;
      resolve();
    };
    (tokenClient as any).requestAccessToken({ prompt: '' });
  });
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

async function driveGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${DRIVE_API}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`Drive GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function drivePost(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${DRIVE_API}/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Drive POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}


async function getOrCreateFolder(): Promise<string> {
  if (folderId) return folderId;

  // Search for existing folder
  const search = await driveGet('files', {
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (search.files?.length > 0) {
    folderId = search.files[0].id;
    return folderId!;
  }

  // Create folder
  const folder = await drivePost('files', {
    name: FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  });
  folderId = folder.id;
  return folderId!;
}

async function findFile(name: string, parentId: string): Promise<string | null> {
  const res = await driveGet('files', {
    q: `name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
  });
  return res.files?.[0]?.id ?? null;
}

// Save jobs JSON to Drive
export async function saveJobs(clientId: string, data: object): Promise<void> {
  await refreshIfNeeded(clientId);
  const folder = await getOrCreateFolder();
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });

  const existingId = await findFile('jobs.json', folder);

  if (existingId) {
    // Update existing file
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: 'jobs.json' })], { type: 'application/json' }));
    form.append('file', blob);
    const res = await fetch(`${UPLOAD_API}/files/${existingId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) throw new Error(`Drive update jobs.json: ${res.status}`);
  } else {
    // Create new file
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: 'jobs.json', parents: [folder] })], { type: 'application/json' }));
    form.append('file', blob);
    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) throw new Error(`Drive create jobs.json: ${res.status}`);
  }
}

// Load jobs JSON from Drive
export async function loadJobs(clientId: string): Promise<object | null> {
  await refreshIfNeeded(clientId);
  const folder = await getOrCreateFolder();
  const fileId = await findFile('jobs.json', folder);
  if (!fileId) return null;

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Drive load jobs.json: ${res.status}`);
  return res.json();
}

// Upload a photo to Drive, returns file metadata
export async function uploadPhoto(
  clientId: string,
  jobId: string,
  file: File
): Promise<{ fileId: string; webViewLink: string; thumbnailLink: string }> {
  await refreshIfNeeded(clientId);
  const folder = await getOrCreateFolder();

  // Ensure photos subfolder
  let photosId: string = await findFile('photos', folder) ?? '';
  if (!photosId) {
    const pf = await drivePost('files', {
      name: 'photos',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folder],
    });
    photosId = pf.id;
  }

  // Ensure per-job subfolder
  let jobFolderId: string = await findFile(jobId, photosId) ?? '';
  if (!jobFolderId) {
    const jf = await drivePost('files', {
      name: jobId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [photosId],
    });
    jobFolderId = jf.id;
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob(
      [JSON.stringify({ name: file.name, parents: [jobFolderId] })],
      { type: 'application/json' }
    )
  );
  form.append('file', file);

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Drive upload photo: ${res.status}`);
  const data = await res.json();
  return { fileId: data.id, webViewLink: data.webViewLink, thumbnailLink: data.thumbnailLink };
}

// Delete a file from Drive
export async function deleteFile(clientId: string, fileId: string): Promise<void> {
  await refreshIfNeeded(clientId);
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete: ${res.status}`);
}

// Make a file publicly readable and return sharable link
export async function shareFile(clientId: string, fileId: string): Promise<string> {
  await refreshIfNeeded(clientId);
  await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  const meta = await driveGet(`files/${fileId}`, { fields: 'webViewLink' });
  return meta.webViewLink;
}
