import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Job, JobStatus, ScopeItem, Material, ScheduleEntry } from './types';

const STORAGE_KEY = 'electrician-jobs';

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function newJob(): Job {
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
      laborRate: 85,
      laborHours: 0,
      materialMarkup: 20,
      notes: '',
      status: 'draft',
      sentAt: null,
    },
    schedule: [],
  };
}

export function useJobStore() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);

  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  function updateJobs(updated: Job[]) {
    setJobs(updated);
  }

  function createJob(partial: Partial<Job>): Job {
    const job = { ...newJob(), ...partial, id: uuidv4() };
    updateJobs([...jobs, job]);
    return job;
  }

  function updateJob(id: string, changes: Partial<Job>) {
    setJobs(prev =>
      prev.map(j =>
        j.id === id ? { ...j, ...changes, updatedAt: new Date().toISOString() } : j
      )
    );
  }

  function deleteJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  function addScopeItem(jobId: string) {
    const item: ScopeItem = { id: uuidv4(), description: '', notes: '' };
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, scopeItems: [...j.scopeItems, item], updatedAt: new Date().toISOString() }
          : j
      )
    );
    return item.id;
  }

  function updateScopeItem(jobId: string, itemId: string, changes: Partial<ScopeItem>) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              scopeItems: j.scopeItems.map(i => (i.id === itemId ? { ...i, ...changes } : i)),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function removeScopeItem(jobId: string, itemId: string) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              scopeItems: j.scopeItems.filter(i => i.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function addMaterial(jobId: string) {
    const mat: Material = { id: uuidv4(), name: '', quantity: 1, unitCost: 0, supplier: '' };
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, materials: [...j.materials, mat], updatedAt: new Date().toISOString() }
          : j
      )
    );
    return mat.id;
  }

  function updateMaterial(jobId: string, matId: string, changes: Partial<Material>) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              materials: j.materials.map(m => (m.id === matId ? { ...m, ...changes } : m)),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function removeMaterial(jobId: string, matId: string) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              materials: j.materials.filter(m => m.id !== matId),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function addScheduleEntry(jobId: string) {
    const entry: ScheduleEntry = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '17:00',
      notes: '',
    };
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, schedule: [...j.schedule, entry], updatedAt: new Date().toISOString() }
          : j
      )
    );
    return entry.id;
  }

  function updateScheduleEntry(jobId: string, entryId: string, changes: Partial<ScheduleEntry>) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              schedule: j.schedule.map(e => (e.id === entryId ? { ...e, ...changes } : e)),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function removeScheduleEntry(jobId: string, entryId: string) {
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              schedule: j.schedule.filter(e => e.id !== entryId),
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }

  function updateStatus(jobId: string, status: JobStatus) {
    updateJob(jobId, { status });
  }

  return {
    jobs,
    createJob,
    updateJob,
    deleteJob,
    addScopeItem,
    updateScopeItem,
    removeScopeItem,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addScheduleEntry,
    updateScheduleEntry,
    removeScheduleEntry,
    updateStatus,
  };
}
