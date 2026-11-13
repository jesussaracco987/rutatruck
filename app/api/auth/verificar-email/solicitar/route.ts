import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/dal";
import { sendEmail } from "@/lib/resend";

export async function POST() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (!user.email) return NextResponse.json({ error: "Tu cuenta no tiene email" }, { status: 400 });
  const email = user.email;

  await db.emailVerificationCode.deleteMany({ where: { userId: user.id } });

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await db.emailVerificationCode.create({
    data: { userId: user.id, code, expiresAt },
  });

  const emailResult = await sendEmail({
    to: email,
    subject: "Verificá tu email — ClickCargo",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0C1E1E;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C1E1E;padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" style="max-width:480px;background:#112424;border-radius:16px;border:1px solid #1E3838;padding:40px;">
              <tr><td>
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">
                  <span style="color:#2DD4BF;">CLICK</span>CARGO
                </p>
                <p style="margin:0 0 28px;font-size:11px;letter-spacing:2px;color:#2DD4BF;opacity:.7;text-transform:uppercase;">
                  Red integral de cargas
                </p>
                <h2 style="margin:0 0 12px;font-size:18px;color:#fff;font-weight:600;">Verificá tu email</h2>
                <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
                  Usá este código para verificar tu cuenta. Vence en <strong style="color:#fff;">15 minutos</strong>.
                </p>
                <p style="margin:0 0 28px;font-size:32px;font-weight:800;letter-spacing:8px;color:#2DD4BF;">
                  ${code}
                </p>
                <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.5;">
                  Si no solicitaste esto, ignorá este email.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });

  if (emailResult.error) {
    console.error("[verificar-email/solicitar] Resend error:", emailResult.error);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
