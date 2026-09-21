import { z } from 'zod';
import type { DbDef, FieldDef } from './types';
import { isWritable } from './index';

/**
 * Builds a Zod schema from a database definition so every API write is checked
 * against the same field list that provisioned Notion in the first place.
 */

const relationValue = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1), label: z.string().optional() }),
]);

const fileValue = z.union([
  z.string().url(),
  z.object({
    name: z.string().default('file'),
    url: z.string().default(''),
    uploadId: z.string().optional(),
    expiryTime: z.string().optional(),
  }),
]);

function fieldSchema(field: FieldDef): z.ZodTypeAny {
  switch (field.type) {
    case 'title':
    case 'text':
    case 'longtext':
      return z.string();
    case 'number':
    case 'money':
    case 'percent':
      return z.union([z.coerce.number(), z.literal('').transform(() => null), z.null()]);
    case 'select':
      return field.options?.length
        ? z.union([z.enum(field.options as [string, ...string[]]), z.literal(''), z.null()])
        : z.string().nullable();
    case 'multi_select':
      return z.union([
        z.array(field.options?.length ? z.enum(field.options as [string, ...string[]]) : z.string()),
        z.string().transform((s) => (s ? s.split(',').map((v) => v.trim()) : [])),
      ]);
    case 'date':
    case 'datetime':
      return z.union([
        z.string().refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Expected an ISO date'),
        z.null(),
      ]);
    case 'checkbox':
      return z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
    case 'url':
      return z.union([z.string().url(), z.literal(''), z.null()]);
    case 'email':
      return z.union([z.string().email(), z.literal(''), z.null()]);
    case 'phone':
      return z.union([z.string(), z.null()]);
    case 'relation':
      return z.union([relationValue, z.array(relationValue)]);
    case 'files':
      return z.union([fileValue, z.array(fileValue)]);
    default:
      return z.unknown();
  }
}

export function recordSchema(db: DbDef, { partial = false }: { partial?: boolean } = {}) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of db.fields) {
    if (!isWritable(field)) continue;
    const base = fieldSchema(field);
    shape[field.key] = field.required && !partial ? base : base.optional();
  }
  // Unknown keys are dropped rather than rejected: a client sending an extra
  // display field should not fail the whole write.
  return z.object(shape).strip();
}

export interface ValidationResult {
  ok: boolean;
  values?: Record<string, unknown>;
  errors?: { field: string; message: string }[];
}

export function validateRecord(db: DbDef, input: unknown, opts: { partial?: boolean } = {}): ValidationResult {
  const parsed = recordSchema(db, opts).safeParse(input);
  if (parsed.success) {
    const values = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    return { ok: true, values };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(record)',
      message: issue.message,
    })),
  };
}
