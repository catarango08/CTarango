import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Job, JobStatus, ScopeItem, Material, ScheduleEntry, Photo,
  AppSettings, TimeEntry, Expense, ChangeOrder, CustomerRecord,
} from './types';
import { DEFAULT_SETTINGS } from './types';

const JOBS_KEY = 'electrician-jobs';
const SETTINGS_KEY = 'electrician-settings';
const CUSTOMERS_KEY = 'electrician-customers';

function migrateJob(j: Job): Job {
  return {
    ...j,
    photos: j.photos ?? [],
    safetyChecklist: j.safetyChecklist ?? {},
    timeEntries: j.timeEntries ?? [],
    expenses: j.expenses ?? [],
    changeOrders: j.changeOrders ?? [],
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
  };
}

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const jobs: Job[] = raw ? JSON.parse(raw) : [];
    return jobs.map(migrateJob);
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

function loadCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
    timeEntries: [],
    expenses: [],
    changeOrders: [],
  };
}

export function useJobStore() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [customers, setCustomers] = useState<CustomerRecord[]>(loadCustomers);

  useEffect(() => {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  }, [customers]);

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
    setJobs(incoming.map(migrateJob));
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

  // ---------- Time Tracking ----------
  function clockIn(jobId: string): string {
    const entry: TimeEntry = {
      id: uuidv4(),
      clockIn: new Date().toISOString(),
      clockOut: null,
      notes: '',
    };
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, timeEntries: [...j.timeEntries, entry] }) : j
    ));
    return entry.id;
  }

  function clockOut(jobId: string, entryId: string, notes: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({
            ...j,
            timeEntries: j.timeEntries.map(e =>
              e.id === entryId
                ? { ...e, clockOut: new Date().toISOString(), notes }
                : e
            ),
          })
        : j
    ));
  }

  function updateTimeEntry(jobId: string, entryId: string, changes: Partial<TimeEntry>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, timeEntries: j.timeEntries.map(e => e.id === entryId ? { ...e, ...changes } : e) })
        : j
    ));
  }

  function removeTimeEntry(jobId: string, entryId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, timeEntries: j.timeEntries.filter(e => e.id !== entryId) }) : j
    ));
  }

  // ---------- Expenses ----------
  function addExpense(jobId: string, expense: Omit<Expense, 'id'>): string {
    const id = uuidv4();
    const e: Expense = { ...expense, id };
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, expenses: [...j.expenses, e] }) : j
    ));
    return id;
  }

  function updateExpense(jobId: string, expenseId: string, changes: Partial<Expense>) {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({ ...j, expenses: j.expenses.map(e => e.id === expenseId ? { ...e, ...changes } : e) })
        : j
    ));
  }

  function removeExpense(jobId: string, expenseId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, expenses: j.expenses.filter(e => e.id !== expenseId) }) : j
    ));
  }

  // ---------- Change Orders ----------
  function addChangeOrder(jobId: string, co: Omit<ChangeOrder, 'id' | 'number' | 'createdAt' | 'respondedAt' | 'status'>): string {
    const job = jobs.find(j => j.id === jobId);
    const maxNum = job ? Math.max(0, ...job.changeOrders.map(c => c.number)) : 0;
    const newCo: ChangeOrder = {
      ...co,
      id: uuidv4(),
      number: maxNum + 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, changeOrders: [...j.changeOrders, newCo] }) : j
    ));
    return newCo.id;
  }

  function respondChangeOrder(jobId: string, coId: string, status: 'approved' | 'rejected') {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? touch({
            ...j,
            changeOrders: j.changeOrders.map(co =>
              co.id === coId ? { ...co, status, respondedAt: new Date().toISOString() } : co
            ),
          })
        : j
    ));
  }

  function removeChangeOrder(jobId: string, coId: string) {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? touch({ ...j, changeOrders: j.changeOrders.filter(co => co.id !== coId) }) : j
    ));
  }

  // ---------- Customer Database ----------
  function createCustomer(data: Omit<CustomerRecord, 'id' | 'createdAt'>): CustomerRecord {
    const c: CustomerRecord = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, c]);
    return c;
  }

  function updateCustomer(id: string, changes: Partial<CustomerRecord>) {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function deleteCustomer(id: string) {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }

  return {
    jobs,
    settings,
    customers,
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
    clockIn,
    clockOut,
    updateTimeEntry,
    removeTimeEntry,
    addExpense,
    updateExpense,
    removeExpense,
    addChangeOrder,
    respondChangeOrder,
    removeChangeOrder,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
