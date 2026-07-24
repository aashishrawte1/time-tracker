const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set to send email");
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend request failed: ${res.status} ${body}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Reset your timetrack password",
    `
      <p>Someone requested a password reset for your timetrack account.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 30 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  );
}

export async function sendOrgInviteEmail(to: string, orgName: string, acceptUrl: string): Promise<void> {
  await sendEmail(
    to,
    `You've been invited to join ${orgName} on timetrack`,
    `
      <p>You've been invited to join <strong>${orgName}</strong> on timetrack.</p>
      <p><a href="${acceptUrl}">Click here to accept the invitation</a>. This link expires in 7 days.</p>
      <p>If you weren't expecting this, you can safely ignore this email.</p>
    `,
  );
}

export async function sendLeadNotificationEmail(
  notifyTo: string,
  lead: { name: string; email: string; company: string; teamSize: string; message: string },
): Promise<void> {
  await sendEmail(
    notifyTo,
    `New Business plan inquiry from ${lead.name}`,
    `
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Company:</strong> ${lead.company || "—"}</p>
      <p><strong>Team size:</strong> ${lead.teamSize || "—"}</p>
      <p><strong>Message:</strong><br/>${lead.message || "—"}</p>
    `,
  );
}
