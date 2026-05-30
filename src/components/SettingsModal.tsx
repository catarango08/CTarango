import { useState } from 'react';
import { X, CloudIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AppSettings } from '../types';
import * as drive from '../lib/drive';

interface Props {
  settings: AppSettings;
  driveConnected: boolean;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
  onDriveConnect: () => void;
  onDriveDisconnect: () => void;
}

export default function SettingsModal({
  settings,
  driveConnected,
  onSave,
  onClose,
  onDriveConnect,
  onDriveDisconnect,
}: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [connecting, setConnecting] = useState(false);
  const [driveError, setDriveError] = useState('');

  function updateBiz(key: keyof AppSettings['business'], value: string) {
    setDraft(d => ({ ...d, business: { ...d.business, [key]: value } }));
  }

  function save() {
    onSave(draft);
    onClose();
  }

  async function connectDrive() {
    if (!draft.googleClientId.trim()) {
      setDriveError('Enter your Google Client ID first.');
      return;
    }
    setDriveError('');
    setConnecting(true);
    try {
      // Save the client ID first so it's available during the OAuth flow
      onSave(draft);
      await drive.connect(draft.googleClientId.trim());
      onDriveConnect();
    } catch (e: any) {
      setDriveError(e?.message ?? 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Business Profile */}
          <section>
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Business Profile</h3>
            <div className="space-y-3">
              {(
                [
                  ['companyName', 'Company Name', 'text', 'e.g. Tarango Electric'],
                  ['ownerName', 'Your Name', 'text', 'Full name'],
                  ['address', 'Address', 'text', 'Street, City, State ZIP'],
                  ['phone', 'Phone', 'tel', '(555) 555-5555'],
                  ['email', 'Email', 'email', 'you@example.com'],
                  ['licenseNumber', 'License Number', 'text', 'EC-123456'],
                  ['website', 'Website', 'url', 'https://'],
                ] as [keyof AppSettings['business'], string, string, string][]
              ).map(([key, label, type, placeholder]) => (
                <label key={key} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-32 flex-shrink-0">{label}</span>
                  <input
                    type={type}
                    value={draft.business[key]}
                    onChange={e => updateBiz(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Defaults */}
          <section>
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Job Defaults</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-32 flex-shrink-0">Labor Rate ($/hr)</span>
                <input
                  type="number"
                  min={0}
                  value={draft.defaultLaborRate}
                  onChange={e => setDraft(d => ({ ...d, defaultLaborRate: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-32 flex-shrink-0">Material Markup %</span>
                <input
                  type="number"
                  min={0}
                  value={draft.defaultMarkup}
                  onChange={e => setDraft(d => ({ ...d, defaultMarkup: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </section>

          {/* Google Drive */}
          <section>
            <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">Google Drive Sync</h3>
            <p className="text-xs text-slate-400 mb-3">
              Sync job data and photos to your personal Google Drive. Requires a free Google Cloud project.{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get Client ID →
              </a>
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-32 flex-shrink-0">Client ID</span>
                <input
                  type="text"
                  value={draft.googleClientId}
                  onChange={e => setDraft(d => ({ ...d, googleClientId: e.target.value }))}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </label>

              {driveError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={15} />
                  {driveError}
                </div>
              )}

              <div className="flex items-center gap-3">
                {driveConnected ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      Connected
                    </div>
                    <button
                      onClick={() => { onDriveDisconnect(); }}
                      className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectDrive}
                    disabled={connecting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    <CloudIcon size={15} />
                    {connecting ? 'Connecting…' : 'Connect Google Drive'}
                  </button>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-600">Setup steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Google Cloud Console → APIs &amp; Services → Credentials</li>
                  <li>Create an OAuth 2.0 Client ID (Web application type)</li>
                  <li>Add <code className="bg-slate-200 px-1 rounded">{window.location.origin}</code> to Authorized JavaScript origins</li>
                  <li>Enable the Google Drive API for your project</li>
                  <li>Paste the Client ID above and click Connect</li>
                </ol>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
