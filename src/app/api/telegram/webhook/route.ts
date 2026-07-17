import { NextResponse } from "next/server";

import { clientEnv, serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const NO_STORE = { "Cache-Control": "no-store" };
const BOT_USERNAME = "KotibAi_bot";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    from?: { id?: number; first_name?: string };
    text?: string;
  };
}

type InlineKeyboard = Array<Array<Record<string, unknown>>>;

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const chatId = update?.message?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true }, { headers: NO_STORE });

  const text = update?.message?.text?.trim() ?? "";
  const command = parseCommand(text);

  if (command === "invite") {
    await sendInviteLink(chatId, update?.message?.from?.id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (command === "help") {
    await sendHelp(chatId);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  await sendWelcome(chatId, parseStartPayload(text), update?.message?.from?.first_name);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export function GET() {
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

async function sendWelcome(chatId: number, inviteCode?: string, firstName?: string) {
  const url = appUrl();
  if (inviteCode) url.searchParams.set("invite", inviteCode);

  const greeting = firstName ? `Assalomu alaykum, ${firstName}!` : "Assalomu alaykum!";
  const text = inviteCode
    ? `${greeting}\n\nSiz To'y Daftari guruhiga taklif qilindingiz. Tugmani bosing, mini app ochiladi va siz avtomatik guruhga qo'shilasiz.`
    : `${greeting}\n\nTo'y Daftari orqali to'yona, sovg'a va pul ro'yxatlarini tartibli saqlaysiz. Mini appni ochish uchun pastdagi tugmani bosing.`;

  await sendMessage(chatId, text, [
    [{ text: inviteCode ? "Guruhga qo'shilish" : "To'y Daftarini ochish", web_app: { url: url.toString() } }],
    [{ text: "Yordam", callback_data: "help_disabled" }],
  ]);
}

async function sendHelp(chatId: number) {
  await sendMessage(
    chatId,
    [
      "To'y Daftari yordamchisi",
      "",
      "/start - mini appni ochish",
      "/invite - guruh invite linkini olish",
      "/help - yordam",
      "",
      "Oddiy foydalanuvchilar guruhdagi to'yona ro'yxatini ko'radi. Adminlar esa to'y va sovg'alarni mini app ichida boshqaradi.",
    ].join("\n"),
  );
}

async function sendInviteLink(chatId: number, telegramId?: number) {
  if (!telegramId) {
    await sendMessage(chatId, "Telegram profilingizni aniqlab bo'lmadi. Iltimos, /start ni qayta bosing.");
    return;
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (profileError || !profile) {
    await sendMessage(chatId, "Avval mini appni ochib ro'yxatdan o'ting, keyin /invite ni qayta bosing.");
    return;
  }

  const { data: membership, error } = await supabase
    .from("group_members")
    .select("role, groups!inner(name, invite_code)")
    .eq("user_id", profile.id)
    .in("role", ["owner", "admin"])
    .is("deleted_at", null)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership?.groups) {
    await sendMessage(chatId, "Invite link faqat guruh owner/adminlari uchun. Mini appni ochib guruhga qo'shiling.");
    return;
  }

  const group = Array.isArray(membership.groups) ? membership.groups[0] : membership.groups;
  const link = `https://t.me/${BOT_USERNAME}?start=${group.invite_code}`;

  await sendMessage(
    chatId,
    [`${group.name} uchun invite link:`, "", link, "", "Shu linkni guruh a'zolariga yuboring."].join("\n"),
  );
}

async function sendMessage(chatId: number, text: string, inlineKeyboard: InlineKeyboard = defaultKeyboard()) {
  const response = await fetch(`https://api.telegram.org/bot${serverEnv().TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: inlineKeyboard },
    }),
  });

  if (!response.ok) {
    console.error("[telegram:webhook] sendMessage failed", await response.text());
  }
}

function defaultKeyboard(): InlineKeyboard {
  return [[{ text: "To'y Daftarini ochish", web_app: { url: appUrl().toString() } }]];
}

function appUrl() {
  return new URL(clientEnv.NEXT_PUBLIC_APP_URL ?? "https://to-yana-uchun.vercel.app");
}

function parseStartPayload(text?: string) {
  const match = text?.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
  return match?.[1]?.trim() || undefined;
}

function parseCommand(text: string) {
  return text.match(/^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i)?.[1]?.toLowerCase() ?? "start";
}
