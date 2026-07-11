import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * sendGmailEmail — utility function invoked by other backend functions.
 * Sends an email via the authorized Gmail connector (somosrami@gmail.com).
 * Payload: { to, subject, body }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { to, subject, body: textBody, html, text } = body;

    if (!to || !subject) {
      return Response.json({ error: 'to y subject son requeridos' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build RFC 2822 message with proper UTF-8 encoding
    const fromName = 'RAmi';
    const fromEmail = 'somosrami@gmail.com';

    // RFC 2047 encode subject for UTF-8 (handles accents, emoji, etc.)
    const subjectEncoded = `=?utf-8?B?${toBase64(subject)}?=`;
    const fromEncoded = `=?utf-8?B?${toBase64(fromName)}?= <${fromEmail}>`;

    const isHtml = !!html;
    const plainText = text || textBody || '';

    let rawMessage;
    if (isHtml && plainText) {
      // multipart/alternative: texto plano + HTML — mejora deliverability y evita spam
      const boundary = 'rami_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      rawMessage =
        `From: ${fromEncoded}\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subjectEncoded}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `Content-Type: multipart/alternative; boundary="${boundary}"\r\n` +
        `\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `\r\n` +
        `${plainText}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/html; charset=utf-8\r\n` +
        `\r\n` +
        `${html}\r\n` +
        `--${boundary}--\r\n`;
    } else {
      const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
      const emailContent = isHtml ? html : plainText;
      rawMessage =
        `From: ${fromEncoded}\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subjectEncoded}\r\n` +
        `Content-Type: ${contentType}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `\r\n` +
        emailContent;
    }

    const encodedMessage = toBase64Url(rawMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gmail send error:', res.status, errText);
      return Response.json({ error: `Gmail API error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('sendGmailEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper: UTF-8 string → base64
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Helper: UTF-8 string → base64url (for Gmail API raw field)
function toBase64Url(str) {
  return toBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}