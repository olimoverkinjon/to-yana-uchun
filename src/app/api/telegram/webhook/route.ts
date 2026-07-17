import { NextResponse } from "next/server";

import { clientEnv, serverEnv } from "@/lib/env";

const NO_STORE = { "Cache-Control": "no-store" };

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const chatId = update?.message?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true }, { headers: NO_STORE });

  const inviteCode = parseStartPayload(update?.message?.text);
  const appUrl = new URL(clientEnv.NEXT_PUBLIC_APP_URL ?? "https://to-yana-uchun.vercel.app");
  if (inviteCode) appUrl.searchParams.set("invite", inviteCode);

  const text = inviteCode ? "Guruhga qo'shilish uchun To'y Daftarini oching." : "To'y Daftarini oching.";

  const response = await fetch(`https://api.telegram.org/bot${serverEnv().TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "To'y Daftarini ochish",
              web_app: { url: appUrl.toString() },
            },
          ],
        ],
      },
    }),
  });

  if (!response.ok) {
    console.error("[telegram:webhook] sendMessage failed", await response.text());
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export function GET() {
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

function parseStartPayload(text?: string) {
  const match = text?.match(/^\/start(?:\s+(.+))?$/);
  return match?.[1]?.trim() || undefined;
}
