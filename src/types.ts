export type JobStatus =
  | 'prospect'
  | 'scoped'
  | 'bid_sent'
  | 'accepted'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced';

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface ScopeItem {
  id: string;
  description: string;
  notes: string;
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  supplier: string;
}

export interface Bid {
  laborRate: number;
  laborHours: number;
  materialMarkup: number;
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  sentAt: string | null;
}

export interface ScheduleEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface Job {
  id: string;
  title: string;
  status: JobStatus;
  customer: Customer;
  createdAt: string;
  updatedAt: string;
  scopeDescription: string;
  scopeItems: ScopeItem[];
  materials: Material[];
  bid: Bid;
  schedule: ScheduleEntry[];
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  prospect: 'Prospect',
  scoped: 'Scoped',
  bid_sent: 'Bid Sent',
  accepted: 'Accepted',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  scoped: 'bg-blue-100 text-blue-700',
  bid_sent: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  invoiced: 'bg-teal-100 text-teal-700',
};
