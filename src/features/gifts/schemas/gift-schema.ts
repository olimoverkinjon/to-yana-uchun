import { z } from "zod";

import type { GiftTypeRow } from "@/features/reference-data";

/**
 * The gift form's shape is not fixed — it depends on the chosen gift type.
 * Cash needs an amount and a currency and must not ask for a weight; a cow
 * needs a weight and a unit and must not ask for an amount; "Other" just
 * needs a description.
 *
 * Crucially, that rule is not hardcoded here. gift_types carries
 * requires_amount / requires_currency / requires_weight, and this schema is
 * built from those flags at runtime, so a Super Admin adding a "Car" category
 * next year gets correct validation with no code change. The same flags drive
 * the validate_gift_fields trigger in the database, so the form and the
 * enforcement boundary are reading one source of truth.
 */

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

/**
 * Empty numeric inputs arrive as "", which Number("") coerces to 0 — a
 * silently wrong amount. This maps blank to null and lets the required check
 * below speak for itself.
 */
const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  })
  .refine((value) => value === null || !Number.isNaN(value), { message: "validation.numberInvalid" })
  .refine((value) => value === null || value >= 0, { message: "validation.numberNegative" });

/** The fields every gift has, before the type-specific rules are layered on. */
export const giftBaseSchema = z.object({
  giverName: z.string().trim().min(1, "validation.giverNameRequired").max(200, "validation.giverNameTooLong"),
  giftTypeId: z.string().uuid("validation.giftTypeRequired"),
  amount: optionalNumber,
  currencyId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
  weight: optionalNumber,
  unit: optionalText,
  description: optionalText,
  giftDate: z.string().trim().min(1, "validation.giftDateRequired"),
  notes: optionalText,
});

export type GiftFormValues = z.input<typeof giftBaseSchema>;
export type GiftFormOutput = z.output<typeof giftBaseSchema>;

/**
 * Builds the validation schema for the currently selected gift type.
 *
 * Passing the loaded gift types in (rather than fetching them here) keeps this
 * a pure function: the same input always produces the same schema, so it can
 * be memoized in the form and tested without a database.
 */
export function buildGiftSchema(giftTypes: GiftTypeRow[]) {
  return giftBaseSchema.superRefine((value, ctx) => {
    const type = giftTypes.find((candidate) => candidate.id === value.giftTypeId);
    if (!type) {
      ctx.addIssue({ code: "custom", path: ["giftTypeId"], message: "validation.giftTypeRequired" });
      return;
    }

    if (type.requires_amount && (value.amount === null || value.amount === undefined)) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "validation.amountRequired" });
    }

    if (type.requires_currency && !value.currencyId) {
      ctx.addIssue({ code: "custom", path: ["currencyId"], message: "validation.currencyRequired" });
    }

    if (type.requires_weight && (value.weight === null || value.weight === undefined)) {
      ctx.addIssue({ code: "custom", path: ["weight"], message: "validation.weightRequired" });
    }

    // A weight with no unit is not a quantity, it is a number. The database
    // has no opinion here (unit is nullable), but a ledger meant to be read
    // in ten years does.
    if (value.weight !== null && value.weight !== undefined && !value.unit) {
      ctx.addIssue({ code: "custom", path: ["unit"], message: "validation.unitRequired" });
    }

    // Mirrors the gifts_check constraint: an amount without a currency is
    // meaningless, and a currency without an amount is noise.
    if (value.amount !== null && value.amount !== undefined && !value.currencyId) {
      ctx.addIssue({ code: "custom", path: ["currencyId"], message: "validation.currencyRequired" });
    }
    if (value.currencyId && (value.amount === null || value.amount === undefined)) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "validation.amountRequired" });
    }

    // A type with no declared requirements still has to record *something*,
    // or the entry says only that a person gave an unspecified thing.
    if (!type.requires_amount && !type.requires_weight && !value.description) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "validation.descriptionRequired" });
    }
  });
}

/**
 * Which inputs to render for a gift type. Derived from the same flags as the
 * validation, so the form can never show a field it will not validate — or
 * hide one it will reject you for leaving empty.
 */
export interface GiftFieldVisibility {
  amount: boolean;
  currency: boolean;
  weight: boolean;
  unit: boolean;
  /** Optional for typed gifts; the only meaningful field for untyped ones. */
  description: boolean;
  descriptionRequired: boolean;
}

export function giftFieldVisibility(type: GiftTypeRow | undefined): GiftFieldVisibility {
  if (!type) {
    return {
      amount: false,
      currency: false,
      weight: false,
      unit: false,
      description: true,
      descriptionRequired: false,
    };
  }

  const measured = type.requires_weight;
  const monetary = type.requires_amount;

  return {
    amount: monetary,
    currency: monetary || type.requires_currency,
    weight: measured,
    unit: measured,
    description: true,
    descriptionRequired: !monetary && !measured,
  };
}

export const createGiftInputSchema = z.object({
  eventId: z.string().uuid(),
  values: giftBaseSchema,
  reason: z.string().trim().max(500).optional(),
});

export const updateGiftInputSchema = z.object({
  id: z.string().uuid(),
  values: giftBaseSchema,
  reason: z.string().trim().max(500).optional(),
});

export const giftIdInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});
