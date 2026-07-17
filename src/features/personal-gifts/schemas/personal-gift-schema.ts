import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  })
  .refine((value) => value === null || !Number.isNaN(value), { message: "validation.numberInvalid" })
  .refine((value) => value === null || value >= 0, { message: "validation.numberNegative" });

export const personalGiftSchema = z
  .object({
    eventTitle: z.string().trim().min(1, "validation.titleRequired").max(200, "validation.titleTooLong"),
    recipientName: optionalText,
    amount: optionalNumber,
    currencyId: z
      .string()
      .uuid()
      .nullable()
      .or(z.literal("").transform(() => null)),
    description: optionalText,
    giftDate: z.string().trim().min(1, "validation.giftDateRequired"),
    notes: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.amount !== null && !value.currencyId) {
      ctx.addIssue({ code: "custom", path: ["currencyId"], message: "validation.currencyRequired" });
    }
    if (value.currencyId && value.amount === null) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "validation.amountRequired" });
    }
    if (value.amount === null && !value.description) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "validation.descriptionRequired" });
    }
  });

export type PersonalGiftFormValues = z.input<typeof personalGiftSchema>;
export type PersonalGiftFormOutput = z.output<typeof personalGiftSchema>;
