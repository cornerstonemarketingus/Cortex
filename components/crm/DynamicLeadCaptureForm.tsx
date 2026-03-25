"use client";

import { useMemo, useState } from 'react';

type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select';

type FormFieldOption = {
  label: string;
  value: string;
};

type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
};

type FormSchema = {
  title?: string;
  description?: string;
  submitLabel?: string;
  sourceName?: string;
  fields?: FormField[];
};

type CaptureFormRecord = {
  id: string;
  name: string;
  slug: string;
  schemaJson: unknown;
};

type Props = {
  form: CaptureFormRecord;
};

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSchema(raw: unknown): FormSchema {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const rawFields = Array.isArray(record.fields) ? record.fields : [];

  const fields: FormField[] = [];
  for (const rawField of rawFields) {
    if (!rawField || typeof rawField !== 'object' || Array.isArray(rawField)) {
      continue;
    }

    const item = rawField as Record<string, unknown>;
    const key = asString(item.key);
    if (!key) {
      continue;
    }

    const typeRaw = asString(item.type)?.toLowerCase();
    const type: FieldType =
      typeRaw === 'email' ||
      typeRaw === 'tel' ||
      typeRaw === 'textarea' ||
      typeRaw === 'select'
        ? (typeRaw as FieldType)
        : 'text';

    const options = Array.isArray(item.options)
      ? item.options
          .filter((opt) => opt && typeof opt === 'object' && !Array.isArray(opt))
          .map((opt) => opt as Record<string, unknown>)
          .map((opt) => ({
            label: asString(opt.label) || asString(opt.value) || 'Option',
            value: asString(opt.value) || asString(opt.label) || 'option',
          }))
      : undefined;

    fields.push({
      key,
      label: asString(item.label) || key,
      type,
      required: Boolean(item.required),
      placeholder: asString(item.placeholder),
      options: options && options.length > 0 ? options : undefined,
    });
  }

  return {
    title: asString(record.title),
    description: asString(record.description),
    submitLabel: asString(record.submitLabel),
    sourceName: asString(record.sourceName),
    fields,
  };
}

function getDefaultFields(schema: FormSchema): FormField[] {
  if (schema.fields && schema.fields.length > 0) {
    return schema.fields;
  }

  return [
    { key: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
    { key: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe' },
    { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@company.com' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
    { key: 'message', label: 'How can we help?', type: 'textarea', placeholder: 'Tell us what you need...' },
  ];
}

export default function DynamicLeadCaptureForm({ form }: Props) {
  const schema = useMemo(() => normalizeSchema(form.schemaJson), [form.schemaJson]);
  const fields = useMemo(() => getDefaultFields(schema), [schema]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formTitle = schema.title || form.name;
  const formDescription =
    schema.description || 'Complete this short form and our team will follow up quickly.';
  const submitLabel = schema.submitLabel || 'Submit';

  const onChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmittedLeadId(null);

    try {
      const firstName = values.firstName?.trim() || 'Website Visitor';
      const lastName = values.lastName?.trim() || undefined;
      const email = values.email?.trim() || undefined;
      const phone = values.phone?.trim() || undefined;
      const message = values.message?.trim() || undefined;

      const metadata: Record<string, unknown> = {
        formSlug: form.slug,
        submittedAt: new Date().toISOString(),
        fields: values,
      };

      const response = await fetch('/api/crm/capture/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          sourceType: 'FORM',
          sourceName: schema.sourceName || form.slug,
          firstMessage: message,
          firstMessageChannel: 'CHAT',
          metadata,
        }),
      });

      const payload = (await response.json()) as { lead?: { id?: string }; error?: string };

      if (!response.ok || !payload.lead?.id) {
        throw new Error(payload.error || `Failed to submit form (HTTP ${response.status})`);
      }

      setSubmittedLeadId(payload.lead.id);
      setValues({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unknown submit error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">{formTitle}</h1>
      <p className="mt-2 text-sm text-slate-600">{formDescription}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {field.label}
              {field.required ? ' *' : ''}
            </span>

            {field.type === 'textarea' ? (
              <textarea
                required={field.required}
                value={values[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring"
              />
            ) : field.type === 'select' ? (
              <select
                required={field.required}
                value={values[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring"
              >
                <option value="">Select an option</option>
                {(field.options || []).map((option) => (
                  <option key={`${field.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required={field.required}
                type={field.type}
                value={values[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring"
              />
            )}
          </label>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : submitLabel}
        </button>
      </form>

      {submittedLeadId ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Thanks. Your lead was submitted successfully (ID: {submittedLeadId}).
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
