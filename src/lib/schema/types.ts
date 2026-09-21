/**
 * The schema layer is the single source of truth for VoltFlow.
 *
 * One declarative description of every database and field drives:
 *   - provisioning the Notion workspace (scripts/bootstrap-notion.ts)
 *   - reading/writing Notion pages (src/lib/notion/mapper.ts)
 *   - the generic record browser UI (src/app/records/[db])
 *   - validation of inbound API payloads (src/lib/schema/validate.ts)
 *
 * Add a field here and it shows up everywhere, including in Notion.
 */

export type FieldType =
  | 'title'
  | 'text'
  | 'longtext'
  | 'number'
  | 'money'
  | 'percent'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'relation'
  | 'files'
  | 'created_time'
  | 'last_edited_time'
  // Read-only Notion types. Decoded for display, never written, never created.
  | 'auto_number'
  | 'rollup'
  | 'formula';

export interface FieldDef {
  /** camelCase key used throughout the app and in JSON payloads. */
  key: string;
  /** Property name as it appears in Notion. Renaming here renames it there. */
  label: string;
  type: FieldType;
  /** Choices for select / multi_select. */
  options?: readonly string[];
  /** Target database key for relation fields. */
  relation?: DbKey;
  /** Create the reciprocal property on the related database. */
  dual?: boolean;
  /** Reciprocal property name on the target database (defaults to this db's label). */
  dualLabel?: string;
  required?: boolean;
  help?: string;
  /** Show this column in the generic table view. */
  column?: boolean;
  /** Notion computes this. Never sent on a write, never provisioned. */
  readOnly?: boolean;
  /** Hide from generated forms (derived or system-managed values). */
  derived?: boolean;
  /** Placeholder / example shown in forms. */
  placeholder?: string;
}

export type DbGroup = 'field' | 'crm' | 'money' | 'license' | 'supply' | 'reference';

export interface DbDef {
  key: DbKey;
  /**
   * True when the database already exists in the Tarango Electric OS and we
   * attach to it by id. The bootstrap may add missing properties to these but
   * never creates or replaces them.
   */
  existing?: boolean;
  /** Database title in Notion. */
  label: string;
  /** Singular noun for UI copy. */
  singular: string;
  emoji: string;
  group: DbGroup;
  description: string;
  fields: readonly FieldDef[];
  /** Field key used as the human label for this record elsewhere in the UI. */
  titleKey?: string;
  defaultSort?: { key: string; direction: 'ascending' | 'descending' };
}

export type DbKey =
  | 'jobs'
  | 'customers'
  | 'hourLedger'
  | 'rateBook'
  | 'permits'
  | 'referrals'
  | 'equipment'
  | 'territory'
  | 'jobPhotos'
  | 'truckInventory'
  | 'jobMaterials';

/** A record as the app sees it: plain JSON, Notion page id under `id`. */
export interface RecordValue {
  id: string;
  url?: string;
  createdTime?: string;
  lastEditedTime?: string;
  [key: string]: unknown;
}

/** A relation value: page id plus a cached display label when we have one. */
export interface RelationRef {
  id: string;
  label?: string;
}

export interface FileRef {
  name: string;
  url: string;
  /** Notion file upload id, when the file lives in Notion's own storage. */
  uploadId?: string;
  expiryTime?: string;
}
