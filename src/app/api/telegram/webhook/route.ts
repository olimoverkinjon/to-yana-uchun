import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { clientEnv, serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const NO_STORE = { "Cache-Control": "no-store" };
const BOT_USERNAME = "KotibAi_bot";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    from?: TelegramFrom;
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: TelegramFrom;
    message?: { chat?: { id?: number } };
  };
}

interface TelegramFrom {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

type InlineKeyboard = Array<Array<Record<string, unknown>>>;

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (update?.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const chatId = update?.message?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true }, { headers: NO_STORE });
  if (update.message?.from) await upsertBotProfile(update.message.from);

  const text = update?.message?.text?.trim() ?? "";
  const { command, payload } = parseCommand(text);

  if (command === "newgroup") {
    await createGroupInvite(chatId, update?.message?.from, payload);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (command === "groups") {
    await sendManagedGroupLinks(chatId, update?.message?.from?.id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (command === "invite") {
    await sendManagedGroupLinks(chatId, update?.message?.from?.id);
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
    [
      { text: "Invite link olish", callback_data: "invite" },
      { text: "Yordam", callback_data: "help" },
    ],
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
      "/groups - barcha guruh linklarini ko'rish",
      "/newgroup Sinfdoshlar - yangi alohida guruh linki yaratish",
      "/help - yordam",
      "",
      "Oddiy foydalanuvchilar guruhdagi to'yona ro'yxatini ko'radi. Adminlar esa to'y va sovg'alarni mini app ichida boshqaradi.",
    ].join("\n"),
  );
}

async function sendManagedGroupLinks(chatId: number, telegramId?: number) {
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

  const { data: memberships, error } = await supabase
    .from("group_members")
    .select("role, groups!inner(name, invite_code)")
    .eq("user_id", profile.id)
    .in("role", ["owner", "admin"])
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });

  if (error || !memberships?.length) {
    await sendMessage(chatId, "Invite link faqat guruh owner/adminlari uchun. Mini appni ochib guruhga qo'shiling.");
    return;
  }

  const lines = memberships.flatMap((membership, index) => {
    const group = Array.isArray(membership.groups) ? membership.groups[0] : membership.groups;
    if (!group) return [];
    return [`${index + 1}. ${group.name}`, `https://t.me/${BOT_USERNAME}?start=${group.invite_code}`, ""];
  });

  await sendMessage(
    chatId,
    ["Siz boshqaradigan guruh invite linklari:", "", ...lines, "Har bir link alohida daftar/guruhga olib kiradi."].join(
      "\n",
    ),
    [[{ text: "To'y Daftarini ochish", web_app: { url: appUrl().toString() } }]],
  );
}

async function createGroupInvite(chatId: number, from: TelegramFrom | undefined, rawName?: string) {
  if (!from?.id) {
    await sendMessage(chatId, "Telegram profilingizni aniqlab bo'lmadi. Iltimos, /start ni qayta bosing.");
    return;
  }

  if (!isPlatformOwner(from.id)) {
    await sendMessage(chatId, "Yangi alohida guruh yaratish faqat asosiy super admin uchun.");
    return;
  }

  const name = rawName?.trim();
  if (!name) {
    await sendMessage(chatId, "Guruh nomini yozing. Masalan:\n/newgroup Sinfdoshlar");
    return;
  }

  const profile = await ensureBotProfile(from);
  if (!profile?.id) {
    await sendMessage(chatId, "Profilingizni saqlab bo'lmadi. Iltimos, /start ni qayta bosing.");
    return;
  }

  const supabase = createSupabaseServiceClient();
  const existing = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("owner_id", profile.id)
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing.data?.invite_code) {
    await sendGroupInvite(chatId, existing.data.name, existing.data.invite_code, "Bu guruh oldin yaratilgan.");
    return;
  }

  if (existing.error) {
    console.error("[telegram:webhook] group lookup failed", existing.error);
    await sendMessage(chatId, "Guruh tekshirishda xato bo'ldi. Birozdan keyin qayta urinib ko'ring.");
    return;
  }

  const baseSlug = slugify(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = randomCode(6);
    const slug = leftWithSuffix(baseSlug, suffix, 80);
    const inviteCode = leftWithSuffix(baseSlug, suffix, 60);
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, slug, invite_code: inviteCode, owner_id: profile.id })
      .select("id, name, invite_code")
      .single();

    if (error) {
      if (isUniqueViolation(error)) continue;
      console.error("[telegram:webhook] group create failed", error);
      await sendMessage(chatId, "Guruh yaratishda xato bo'ldi. Birozdan keyin qayta urinib ko'ring.");
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: profile.id,
      role: "owner",
      invited_by: profile.id,
    });

    if (memberError) {
      console.error("[telegram:webhook] group owner membership failed", memberError);
      await sendMessage(chatId, "Guruh yaratildi, lekin owner ulashda xato bo'ldi. Admin paneldan tekshiring.");
      return;
    }

    await sendGroupInvite(chatId, group.name, group.invite_code, "Yangi guruh yaratildi.");
    return;
  }

  await sendMessage(chatId, "Invite code yaratib bo'lmadi. Iltimos, qayta urinib ko'ring.");
}

async function sendGroupInvite(chatId: number, groupName: string, inviteCode: string, title: string) {
  const link = `https://t.me/${BOT_USERNAME}?start=${inviteCode}`;
  const directUrl = appUrl();
  directUrl.searchParams.set("invite", inviteCode);

  await sendMessage(
    chatId,
    [
      title,
      "",
      `${groupName} uchun invite link:`,
      link,
      "",
      "Bu link orqali kirgan odam faqat shu guruh ma'lumotlarini ko'radi.",
    ].join("\n"),
    [[{ text: `${groupName}ni ochish`, web_app: { url: directUrl.toString() } }]],
  );
}

async function upsertBotProfile(from: TelegramFrom) {
  if (!from.id || !from.first_name) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("upsert_telegram_profile", {
    p_telegram_id: from.id,
    p_first_name: from.first_name,
    p_is_premium: from.is_premium ?? false,
    p_username: (from.username ?? null) as unknown as string,
    p_last_name: (from.last_name ?? null) as unknown as string,
    p_photo_url: null as unknown as string,
    p_language_code: (from.language_code ?? null) as unknown as string,
  });

  if (error) {
    console.error("[telegram:webhook] profile upsert failed", error);
    return null;
  }

  return data;
}

async function ensureBotProfile(from: TelegramFrom) {
  await upsertBotProfile(from);
  if (!from.id) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, telegram_id")
    .eq("telegram_id", from.id)
    .maybeSingle();

  if (error) {
    console.error("[telegram:webhook] profile lookup failed", error);
    return null;
  }

  return data;
}

async function handleCallbackQuery(query: NonNullable<TelegramUpdate["callback_query"]>) {
  if (query.from) await upsertBotProfile(query.from);
  const chatId = query.message?.chat?.id;
  if (!chatId) {
    await answerCallbackQuery(query.id);
    return;
  }

  if (query.data === "invite") {
    await answerCallbackQuery(query.id, "Guruh linklari tayyorlanmoqda...");
    await sendManagedGroupLinks(chatId, query.from?.id);
    return;
  }

  if (query.data === "help") {
    await answerCallbackQuery(query.id);
    await sendHelp(chatId);
    return;
  }

  await answerCallbackQuery(query.id);
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const response = await fetch(`https://api.telegram.org/bot${serverEnv().TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });

  if (!response.ok) {
    console.error("[telegram:webhook] answerCallbackQuery failed", await response.text());
  }
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
  return [
    [{ text: "To'y Daftarini ochish", web_app: { url: appUrl().toString() } }],
    [
      { text: "Invite link olish", callback_data: "invite" },
      { text: "Yordam", callback_data: "help" },
    ],
  ];
}

function appUrl() {
  return new URL(clientEnv.NEXT_PUBLIC_APP_URL ?? "https://to-yana-uchun.vercel.app");
}

function parseStartPayload(text?: string) {
  const match = text?.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
  return match?.[1]?.trim() || undefined;
}

function parseCommand(text: string) {
  const match = text.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  return {
    command: match?.[1]?.toLowerCase() ?? "start",
    payload: match?.[2]?.trim(),
  };
}

function isPlatformOwner(telegramId: number) {
  return (
    serverEnv()
      .BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(String(telegramId)) ?? false
  );
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "guruh";
}

function randomCode(size: number) {
  return crypto
    .randomBytes(size)
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, size);
}

function leftWithSuffix(base: string, suffix: string, maxLength: number) {
  const normalized = base || "guruh";
  const roomForBase = Math.max(1, maxLength - suffix.length - 1);
  return `${normalized.slice(0, roomForBase).replace(/-+$/g, "")}-${suffix}`;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
