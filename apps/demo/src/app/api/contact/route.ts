import { createContactHandler, resendAdapter, fileLogAdapter } from '@nabcor/core/server';

export const runtime = 'nodejs';

/**
 * Contact endpoint. Resend when credentials are present; otherwise the file-log
 * adapter (pre-credential handoff window) — it logs the lead and NEVER pretends
 * to send. "Sends nowhere" is impossible: an adapter is always chosen.
 */
export const POST = createContactHandler({
  adapter: () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return resendAdapter({
        apiKey,
        from: process.env.CONTACT_FROM_EMAIL || 'noreply@novalt.example',
        to: process.env.CONTACT_TO_EMAIL || 'hello@novalt.example',
      });
    }
    return fileLogAdapter();
  },
});
