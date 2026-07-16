import { z } from "zod";

/**
 * The event form's contract, and the server action's input guard — one
 * schema, both jobs. The database has its own CHECK constraints saying the
 * same things (year range, status values, date/year agreement); this is not a
 * substitute for them but a way to say it in the user's language before a
 * round trip.
 */

export const EVENT_STATUSES = ["draft", "active", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Mirrors the events_event_year_check constraint. */
export const MIN_EVENT_YEAR = 1900;
export const MAX_EVENT_YEAR = 2100;

/** Treats "" as absent, so an untouched optional input is null, not "". */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "validation.titleRequired").max(200, "validation.titleTooLong"),
    brideName: optionalText,
    groomName: optionalText,
    description: optionalText,
    /**
     * Optional on purpose: this product exists to digitize handwritten
     * notebooks that frequently recorded only a year, and forcing an invented
     * day would put fiction in a permanent record. The database agrees —
     * event_date is nullable while event_year is not.
     */
    eventDate: optionalText,
    eventYear: z.coerce
      .number({ message: "validation.yearRequired" })
      .int("validation.yearInvalid")
      .min(MIN_EVENT_YEAR, "validation.yearOutOfRange")
      .max(MAX_EVENT_YEAR, "validation.yearOutOfRange"),
    location: optionalText,
    coverImage: optionalText,
    status: z.enum(EVENT_STATUSES),
  })
  .superRefine((value, ctx) => {
    if (!value.eventDate) return;

    const parsed = new Date(value.eventDate);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: "custom", path: ["eventDate"], message: "validation.dateInvalid" });
      return;
    }

    // The database enforces this too (a CHECK that the date's year equals
    // event_year). Catching it here turns a constraint violation into a
    // message pointing at the field that is actually wrong.
    if (parsed.getUTCFullYear() !== value.eventYear) {
      ctx.addIssue({ code: "custom", path: ["eventDate"], message: "validation.dateYearMismatch" });
    }
  });

export type EventFormValues = z.input<typeof eventFormSchema>;
export type EventFormOutput = z.output<typeof eventFormSchema>;

/** Server action input: the form's output plus an optional audit reason. */
export const createEventInputSchema = z.object({
  values: eventFormSchema,
  reason: z.string().trim().max(500).optional(),
});

export const updateEventInputSchema = z.object({
  id: z.string().uuid(),
  values: eventFormSchema,
  reason: z.string().trim().max(500).optional(),
});

export const eventIdInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const setEventStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(EVENT_STATUSES),
  reason: z.string().trim().max(500).optional(),
});
