'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FieldDef, RecordValue } from '@/lib/schema';

export interface RelationOption {
  id: string;
  label: string;
}

/**
 * A form generated from the schema. Because the field list is the same one the
 * bootstrap script used, a new field shows up here the moment it exists in
 * Notion — no form code to update.
 */
export function RecordForm({
  db,
  dbLabel,
  fields,
  record,
  relationOptions,
  redirectTo,
}: {
  db: string;
  dbLabel: string;
  fields: FieldDef[];
  record?: RecordValue;
  relationOptions: Record<string, RelationOption[]>;
  redirectTo: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(fields, record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ field: string; message: string }[]>([]);

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.key];
      if (value === '' || value === undefined) {
        if (field.required) payload[field.key] = value ?? '';
        continue;
      }
      payload[field.key] = field.type === 'relation' && typeof value === 'string' ? [{ id: value }] : value;
    }

    try {
      const res = await fetch(record ? `/api/records/${db}/${record.id}` : `/api/records/${db}`, {
        method: record ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        record?: RecordValue;
        error?: string;
        issues?: { field: string; message: string }[];
      };
      if (!res.ok) {
        setError(body.error ?? `Save failed (${res.status})`);
        setIssues(body.issues ?? []);
        return;
      }
      router.push(body.record?.id && !record ? `${redirectTo}` : redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <p className="font-medium text-rose-200">{error}</p>
          {issues.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-rose-200/90">
              {issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  <span className="font-mono">{issue.field}</span>: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={field.type === 'longtext' ? 'md:col-span-2' : ''}>
            <span className="label">
              {field.label}
              {field.required ? <span className="ml-1 text-rose-300">*</span> : null}
            </span>
            <Input field={field} value={values[field.key]} onChange={(v) => set(field.key, v)} relationOptions={relationOptions} />
            {field.help ? <span className="mt-1 block text-xs text-[color:var(--muted)]">{field.help}</span> : null}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : record ? `Save ${dbLabel}` : `Create ${dbLabel}`}
        </button>
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}

function Input({
  field,
  value,
  onChange,
  relationOptions,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  relationOptions: Record<string, RelationOption[]>;
}) {
  switch (field.type) {
    case 'longtext':
      return <textarea className="input mt-1 min-h-24" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
    case 'select':
      return (
        <select className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    case 'multi_select':
      return (
        <select
          multiple
          className="input mt-1 min-h-28"
          value={(Array.isArray(value) ? value : []).map(String)}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    case 'relation': {
      const options = relationOptions[field.relation ?? ''] ?? [];
      const current = Array.isArray(value) ? (value[0] as { id?: string })?.id ?? '' : String(value ?? '');
      return (
        <select className="input mt-1" value={current} onChange={(e) => onChange(e.target.value ? [{ id: e.target.value }] : [])}>
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.label || 'Untitled'}</option>
          ))}
        </select>
      );
    }
    case 'checkbox':
      return (
        <span className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="accent-volt-400" />
          <span className="text-sm text-[color:var(--muted)]">Yes</span>
        </span>
      );
    case 'date':
      return <input type="date" className="input mt-1" value={String(value ?? '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime':
      return (
        <input
          type="datetime-local"
          className="input mt-1"
          value={String(value ?? '').slice(0, 16)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        />
      );
    case 'number':
    case 'money':
      return <input type="number" step="0.01" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
    case 'percent':
      return <input type="number" step="0.001" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder="0.085 = 8.5%" />;
    case 'email':
      return <input type="email" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    case 'url':
      return <input type="url" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    case 'phone':
      return <input type="tel" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    case 'files':
      return (
        <span className="mt-1 block text-sm text-[color:var(--muted)]">
          Files are attached from the photo uploader or the job page, not here.
        </span>
      );
    default:
      return <input type="text" className="input mt-1" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
}

function initialValues(fields: FieldDef[], record?: RecordValue): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const existing = record?.[field.key];
    if (field.type === 'multi_select') values[field.key] = Array.isArray(existing) ? existing : [];
    else if (field.type === 'relation') values[field.key] = Array.isArray(existing) ? existing : [];
    else if (field.type === 'checkbox') values[field.key] = Boolean(existing);
    else values[field.key] = existing ?? '';
  }
  return values;
}
