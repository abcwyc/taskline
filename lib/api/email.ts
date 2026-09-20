import 'server-only';

import { db } from '@/lib/db';
import { logError } from '@/lib/logger';

/**
 * Outbound email over SMTP (nodemailer). Configure either:
 *   SMTP_URL=smtp://user:pass@host:587
 * or the discrete vars SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
 * plus optional SMTP_SECURE=true and MAIL_FROM (default "Taskline <no-reply@localhost>").
 *
 * When nothing is configured, email is silently skipped — in-app notifications
 * still work — so the deployment degrades gracefully.
 */

function transportOptions() {
   if (process.env.SMTP_URL) return process.env.SMTP_URL;
   if (!process.env.SMTP_HOST) return null;
   return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER
         ? {
              auth: {
                 user: process.env.SMTP_USER,
                 pass: process.env.SMTP_PASS ?? '',
              },
           }
         : {}),
   };
}

export function isEmailConfigured(): boolean {
   return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
}

async function transporter() {
   const options = transportOptions();
   if (!options) return null;
   const nodemailer = await import('nodemailer');
   return nodemailer.createTransport(options);
}

/**
 * Fire-and-forget notification email to every listed user whose
 * `notifyEmail` preference is on. Never throws into the caller's path.
 */
export async function sendNotificationEmails(
   userIds: string[],
   subject: string,
   body: string
): Promise<void> {
   if (!userIds.length || !isEmailConfigured()) return;
   try {
      const users = await db.user.findMany({
         where: { id: { in: userIds } },
         select: { id: true, email: true, preferences: true },
      });
      const recipients = users.filter((u) => {
         const prefs = u.preferences as Record<string, unknown> | null;
         return prefs ? prefs.notifyEmail !== false : false; // opt-in is explicit
      });
      if (!recipients.length) return;

      const mail = await transporter();
      if (!mail) return;
      const from = process.env.MAIL_FROM || 'Taskline <no-reply@localhost>';
      await mail.sendMail({
         from,
         bcc: recipients.map((r) => r.email),
         subject,
         text: body,
      });
   } catch (err) {
      // Delivery problems must never break the mutation that triggered them.
      logError('email.sendFailed', err);
   }
}
