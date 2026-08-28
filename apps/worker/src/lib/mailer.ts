/**
 * SMTP out (SPEC §3: Mailpit locally, console fallback). Owner: WS-G.
 *
 * The transport is created lazily and reused — nodemailer pools the connection,
 * and building one per job would reconnect to Mailpit for every order.
 */
import { env } from '@merchant/config/env';
import { createTransport, type Transporter } from 'nodemailer';
import { logger } from './logger.ts';

export type OutgoingMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Display name on the From header — the shop, not "Merchant". */
  fromName: string;
};

let transporter: Transporter | undefined;

function transport(): Transporter {
  if (!transporter) {
    const config = env();
    transporter = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      // Mailpit accepts anonymous SMTP; a real relay gets credentials.
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

/** `Aurora Supply Co. <orders@demo.dev>` — shop name over the configured address. */
function sender(fromName: string): string {
  const configured = env().EMAIL_FROM;
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
  return `"${fromName.replace(/["\\]/g, '')}" <${address.trim()}>`;
}

/**
 * Returns true if SMTP accepted the message.
 *
 * `fallbackToConsole` prints the mail instead of throwing — used on the final
 * attempt so a stopped Mailpit degrades the demo to a console dump rather than
 * an error, which is exactly the trade SPEC §3 asks for.
 */
export async function sendMail(
  mail: OutgoingMail,
  { fallbackToConsole = false }: { fallbackToConsole?: boolean } = {},
): Promise<boolean> {
  try {
    await transport().sendMail({
      from: sender(mail.fromName),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    logger.info('email sent', { to: mail.to, subject: mail.subject });
    return true;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Reconnect on the next send rather than reusing a broken pool.
    transporter = undefined;
    if (!fallbackToConsole) throw new Error(`SMTP send failed: ${reason}`);
    logger.warn('SMTP unavailable — printing the email instead', { to: mail.to, reason });
    console.log(`\n--- ${mail.subject}\nTo: ${mail.to}\n\n${mail.text}\n---\n`);
    return false;
  }
}
