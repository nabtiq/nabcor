'use client';
/**
 * The single shared contact form. Uncontrolled inputs + FormData +
 * Object.fromEntries + a useState status machine (the josouralazl/nabtiq
 * pattern). Labels arrive as props — no client i18n context needed. Posts to a
 * route created with `createContactHandler` (src/api/contact.ts); it cannot
 * silently send nowhere, because the route + adapter are part of the core.
 */
import { useState } from 'react';

export interface ContactLabels {
  name: string;
  email: string;
  service: string;
  selectService: string;
  message: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
}

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function ContactForm({
  labels,
  services = [],
  action = '/api/contact',
}: {
  labels: ContactLabels;
  services?: { value: string; label: string }[];
  action?: string;
}) {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  const field: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--color-text-primary, inherit)',
    background: 'var(--color-surface-2, #fff)',
    border: '1px solid var(--color-border, rgba(0,0,0,0.15))',
    borderRadius: 'var(--radius-sharp, 4px)',
    outline: 'none',
  };
  const label: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' };

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: '16px', maxWidth: '520px' }}>
      <label>
        <span style={label}>{labels.name}</span>
        <input name="name" type="text" required maxLength={120} autoComplete="name" style={field} />
      </label>
      <label>
        <span style={label}>{labels.email}</span>
        <input name="email" type="email" required autoComplete="email" style={field} />
      </label>
      {services.length > 0 && (
        <label>
          <span style={label}>{labels.service}</span>
          <select name="service" defaultValue="" style={{ ...field, appearance: 'auto' }}>
            <option value="" disabled>
              {labels.selectService}
            </option>
            {services.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span style={label}>{labels.message}</span>
        <textarea name="message" required rows={5} maxLength={2000} style={{ ...field, resize: 'vertical' }} />
      </label>

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          padding: '12px 24px',
          fontWeight: 700,
          color: 'var(--color-on-brand, #fff)',
          background: 'var(--color-brand-500, #6d28d9)',
          border: 'none',
          borderRadius: 'var(--radius-pill, 9999px)',
          cursor: status === 'sending' ? 'default' : 'pointer',
          opacity: status === 'sending' ? 0.6 : 1,
        }}
      >
        {status === 'sending' ? labels.sending : labels.submit}
      </button>

      <div aria-live="polite" role="status">
        {status === 'ok' && <p style={{ color: 'var(--color-success, #15803d)', fontWeight: 600 }}>{labels.success}</p>}
        {status === 'error' && <p style={{ color: 'var(--color-danger, #b91c1c)', fontWeight: 600 }}>{labels.error}</p>}
      </div>
    </form>
  );
}
