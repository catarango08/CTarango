import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Job, JobStatus, ScopeItem, Material, ScheduleEntry, Photo, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

const JOBS_KEY = 'electrician-jobs';
const SETTINGS_KEY = 'electrician-settings';

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const jobs: Job[] = raw ? JSON.parse(raw) : [];
    // Migrate old jobs that lack new fields
    return jobs.map(j => ({
      ...j,
      photos: j.photos ?? [],
      safetyChecklist: j.safetyChecklist ?? {},
      invoice: j.invoice ?? {
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
        paymentTerms: 'Due on Receipt',
        notes: '',
        status: 'draft' as const,
        sentAt: null,
        paidAt: null,
      },
    }));
  } catch {
    return [];
  }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function newJob(settings: AppSettings): Job {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: '',
    status: 'prospect',
    customer: { name: '', phone: '', email: '', address: '' },
    createdAt: now,
    updatedAt: now,
    scopeDescription: '',
    scopeItems: [],
    materials: [],
    bid: {
      laborRate: settings.defaultLaborRate,
      laborHours: 0,
      materialMarkup: settings.defaultMarkup,
      notes: '',
      status: 'draft',
      sentAt: null,
    },
    invoice: {
      invoiceNumber: '',
      issueDate: '',
      dueDate: '',
      paymentTerms: 'Due on Receipt',
      notes: '',
      status: 'draft',
      sentAt: null,
      paidAt: null,
    },
    schedule: [],
    photos: [],
    safetyChecklist: {},
  };
}

export function useJobStore() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateSettings(changes: Partial<AppSettings>) {
    setSettings(s => ({ ...s, ...changes }));
  }

  function touch(j: Job): Job {
    return { ...j, updatedAt: new Date().toISOString() };
  }

  function createJob(partial: Partial<Job>): Job {
    const job = { ...newJob(settings), ...partial, id: uuidv4() };
    setJobs(prev => [...prev, job]);
    return job;
  }

  function updateJob(id: string, changes: Partial<Job>) {
    setJobs(prev => prev.map(j => j.id === id ? touch({ ...j, ...changes }) : j));
  }

  function deleteJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  // Replace all jobs (used when loading from Drive)
  function replaceAllJobs(incoming: Job[]) {
    setJobs(incoming.map(j => ({
      ...j,
      photos: j.photos ?? [],
      safetyChecklist: j.safetyChecklist ?? {},
      invoice: j.invoice ?? {
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
        paymentTerms: 'Due on Receipt',
        notes: '',
        status: 'draft' as const,
        sentAt: null,
        paidAt: null,
      },
    })));
  }

  // ---------- Scope ----------
  function addScopeItem(jobId: string): string {
    const item: ScopeItem = { id: uuidv4(), description: '', notes: '' };
    setJobs(prev => prev.map(j => j.id === jobId ? touch({ ...j, scopeItems: [...j.scopeItems, item] }) : j));
    return item.id;
  }

  function updateScopeItem(jobId: string, itemId: string, changes: Partial<ScopeItem>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, scopeItems: j.scopeItems.map(i => i.id === itemId ? { ...i, ...changes } : i) })
        : j
    ));
  }

  function removeScopeItem(jobId: string, itemId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, scopeItems: j.scopeItems.filter(i => i.id !== itemId) }) : j
    ));
  }

  // ---------- Materials ----------
  function addMaterial(jobId: string): string {
    const mat: Material = { id: uuidv4(), name: '', quantity: 1, unitCost: 0, supplier: '' };
    setJobs(prev => prev.map(j => j.id === jobId ? touch({ ...j, materials: [...j.materials, mat] }) : j));
    return mat.id;
  }

  function updateMaterial(jobId: string, matId: string, changes: Partial<Material>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, materials: j.materials.map(m => m.id === matId ? { ...m, ...changes } : m) })
        : j
    ));
  }

  function removeMaterial(jobId: string, matId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, materials: j.materials.filter(m => m.id !== matId) }) : j
    ));
  }

  // ---------- Schedule ----------
  function addScheduleEntry(jobId: string): string {
    const entry: ScheduleEntry = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '17:00',
      notes: '',
    };
    setJobs(prev => prev.map(j => j.id === jobId ? touch({ ...j, schedule: [...j.schedule, entry] }) : j));
    return entry.id;
  }

  function updateScheduleEntry(jobId: string, entryId: string, changes: Partial<ScheduleEntry>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, schedule: j.schedule.map(e => e.id === entryId ? { ...e, ...changes } : e) })
        : j
    ));
  }

  function removeScheduleEntry(jobId: string, entryId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, schedule: j.schedule.filter(e => e.id !== entryId) }) : j
    ));
  }

  // ---------- Photos ----------
  function addPhoto(jobId: string, photo: Photo) {
    setJobs(prev => prev.map(j => j.id === jobId ? touch({ ...j, photos: [...j.photos, photo] }) : j));
  }

  function updatePhoto(jobId: string, photoId: string, changes: Partial<Photo>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, photos: j.photos.map(p => p.id === photoId ? { ...p, ...changes } : p) })
        : j
    ));
  }

  function removePhoto(jobId: string, photoId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, photos: j.photos.filter(p => p.id !== photoId) }) : j
    ));
  }

  // ---------- Invoice ----------
  function nextInvoiceNumber(): string {
    const num = settings.nextInvoiceNumber;
    updateSettings({ nextInvoiceNumber: num + 1 });
    return `INV-${String(num).padStart(4, '0')}`;
  }

  // ---------- Safety Checklist ----------
  function toggleSafetyItem(jobId: string, itemId: string, checked: boolean) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, safetyChecklist: { ...j.safetyChecklist, [itemId]: checked } })
        : j
    ));
  }

  // ---------- Status ----------
  function updateStatus(jobId: string, status: JobStatus) {
    updateJob(jobId, { status });
  }

  return {
    jobs,
    settings,
    updateSettings,
    createJob,
    updateJob,
    deleteJob,
    replaceAllJobs,
    addScopeItem,
    updateScopeItem,
    removeScopeItem,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addScheduleEntry,
    updateScheduleEntry,
    removeScheduleEntry,
    addPhoto,
    updatePhoto,
    removePhoto,
    nextInvoiceNumber,
    toggleSafetyItem,
    updateStatus,
  };
}
