/**
 * The one contact pipeline. The audit found three sites with three answers,
 * one of which silently sent nowhere. Here delivery is a required, explicit
 * adapter — a route with no adapter does not type-check, so "sends nowhere"
 * cannot happen by omission.
 *
 * Adapters:
 *   - resendAdapter — production default (email via Resend).
 *   - fileLogAdapter — pre-credential handoff: appends leads to a JSONL file
 *     and logs to stdout, mirroring josouralazl's `{{TODO_CLIENT}}` window so a
 *     site can go live before SMTP/Resend credentials arrive, WITHOUT pretending
 *     to send.
 */

export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  service?: string;
  receivedAt: string;
}

export interface ContactAdapter {
  /** Human-readable name, surfaced in health checks/logs. */
  name: string;
  deliver(submission: ContactSubmission): Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Deliver the lead as an email via Resend. `resend` is imported lazily. */
export function resendAdapter(opts: { apiKey: string; from: string; to: string }): ContactAdapter {
  return {
    name: 'resend',
    async deliver(s) {
      // Dynamic, non-literal specifier keeps `resend` an optional dependency:
      // sites that use fileLog never need it installed.
      const spec = 'resend';
      const mod: { Resend: new (k: string) => { emails: { send: (a: unknown) => Promise<{ error?: unknown }> } } } =
        await import(/* webpackIgnore: true */ spec);
      const resend = new mod.Resend(opts.apiKey);
      const { error } = await resend.emails.send({
        from: opts.from,
        to: [opts.to],
        replyTo: s.email,
        subject: `New enquiry — ${s.name}${s.service ? ` (${s.service})` : ''}`,
        text: `Name: ${s.name}\nEmail: ${s.email}\nService: ${s.service ?? '(none)'}\n\n${s.message}\n\nReceived: ${s.receivedAt}`,
        html: `<h2>New enquiry</h2><p><strong>Name:</strong> ${esc(s.name)}<br/><strong>Email:</strong> ${esc(s.email)}<br/><strong>Service:</strong> ${esc(s.service ?? '(none)')}</p><p style="white-space:pre-wrap">${esc(s.message)}</p>`,
      });
      if (error) throw new Error(`resend failed: ${JSON.stringify(error)}`);
    },
  };
}

/** Append leads to a JSONL file + stdout. For the pre-credential window. */
export function fileLogAdapter(opts: { path?: string } = {}): ContactAdapter {
  const path = opts.path ?? '/tmp/contact-leads.jsonl';
  return {
    name: 'file-log',
    async deliver(s) {
      // eslint-disable-next-line no-console
      console.log('[contact-lead]', JSON.stringify(s));
      const spec = 'node:fs/promises';
      const fs: { appendFile: (p: string, d: string) => Promise<void> } = await import(/* webpackIgnore: true */ spec);
      await fs.appendFile(path, JSON.stringify(s) + '\n').catch(() => {
        /* best-effort; the stdout line above is the source of truth */
      });
    },
  };
}

export interface ContactHandlerOptions {
  /** The delivery adapter, or a factory returning one (lets it read env lazily). */
  adapter: ContactAdapter | (() => ContactAdapter);
}

/**
 * Build a POST route handler for /api/contact. Validates server-side, then
 * delivers via the adapter. Returns Next-compatible `Response`s.
 */
export function createContactHandler(options: ContactHandlerOptions) {
  return async function POST(request: Request): Promise<Response> {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const message = String(body.message ?? '').trim();
    const service = body.service ? String(body.service).trim() : undefined;

    if (name.length < 2) return Response.json({ ok: false, error: 'name' }, { status: 422 });
    if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: 'email' }, { status: 422 });
    if (message.length < 10) return Response.json({ ok: false, error: 'message' }, { status: 422 });

    const submission: ContactSubmission = {
      name: name.slice(0, 120),
      email: email.slice(0, 200),
      message: message.slice(0, 2000),
      service: service?.slice(0, 80),
      receivedAt: new Date().toISOString(),
    };

    const adapter = typeof options.adapter === 'function' ? options.adapter() : options.adapter;
    try {
      await adapter.deliver(submission);
      return Response.json({ ok: true }, { status: 200 });
    } catch (err) {
      // Never swallow: surface a real 502 so a broken pipeline is visible.
      // eslint-disable-next-line no-console
      console.error('[contact] delivery failed via', adapter.name, err);
      return Response.json({ ok: false, error: 'delivery_failed' }, { status: 502 });
    }
  };
}
