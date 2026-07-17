"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, useFieldAria } from "@/shared/components/form/form-field";

import {
  EVENT_STATUSES,
  eventFormSchema,
  MAX_EVENT_YEAR,
  MIN_EVENT_YEAR,
  type EventFormOutput,
  type EventFormValues,
} from "../schemas/event-schema";
import type { EventSummaryRow } from "../types";

interface EventFormProps {
  event?: EventSummaryRow | null;
  isPending?: boolean;
  onSubmit: (values: EventFormOutput) => void;
  onCancel: () => void;
}

function toDefaults(event?: EventSummaryRow | null): EventFormValues {
  return {
    title: event?.title ?? "",
    brideName: event?.bride_name ?? "",
    groomName: event?.groom_name ?? "",
    description: event?.description ?? "",
    eventDate: event?.event_date ?? "",
    eventYear: event?.event_year ?? new Date().getFullYear(),
    location: event?.location ?? "",
    coverImage: event?.cover_image ?? "",
    status: (event?.status as EventFormValues["status"]) ?? "active",
  };
}

/**
 * The event form, for both create and edit — the two differ only in their
 * default values and which action runs on submit, so they are one component.
 *
 * Validation lives in eventFormSchema; FormField translates the i18n keys it
 * produces. `mode: "onBlur"` rather than "onChange" on purpose: flagging a
 * title as required while someone is still typing the first letter is noise,
 * not help.
 */
export function EventForm({ event, isPending = false, onSubmit, onCancel }: EventFormProps) {
  const t = useTranslations("events.fields");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("events.status");

  const form = useForm<EventFormValues, unknown, EventFormOutput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: toDefaults(event),
    mode: "onBlur",
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="space-y-4"
      // Telegram's in-app browser will happily offer to autofill a person's
      // own details into a bride/groom field. These are other people's names.
      autoComplete="off"
      noValidate
    >
      <FormField form={form} name="title" label={t("title")}>
        {(field) => <TitleInput field={field} placeholder={t("titlePlaceholder")} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="brideName" label={t("brideName")} description={t("brideNameHint")}>
          {(field) => <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
        </FormField>

        <FormField form={form} name="groomName" label={t("groomName")}>
          {(field) => <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField form={form} name="eventYear" label={t("eventYear")}>
          {(field) => (
            <NumberInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              min={MIN_EVENT_YEAR}
              max={MAX_EVENT_YEAR}
            />
          )}
        </FormField>

        <FormField form={form} name="eventDate" label={t("eventDate")} description={t("eventDateHint")}>
          {(field) => <DateInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
        </FormField>
      </div>

      <FormField form={form} name="location" label={t("location")}>
        {(field) => (
          <TextInput
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={t("locationPlaceholder")}
          />
        )}
      </FormField>

      <FormField form={form} name="description" label={t("description")}>
        {(field) => <TextAreaInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
      </FormField>

      <FormField form={form} name="coverImage" label={t("coverImage")}>
        {(field) => <UrlInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
      </FormField>

      <FormField form={form} name="status" label={t("status")}>
        {(field) => (
          <StatusSelect value={field.value} onChange={field.onChange}>
            {EVENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tStatus(status)}
              </SelectItem>
            ))}
          </StatusSelect>
        )}
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Field controls — each reads its own a11y wiring from FormField.     */
/* ------------------------------------------------------------------ */

interface ControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  placeholder?: string;
}

function TitleInput({ field, placeholder }: { field: ControlProps; placeholder?: string }) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      value={(field.value as string) ?? ""}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      placeholder={placeholder}
      className="h-10"
    />
  );
}

function TextInput({ value, onChange, onBlur, placeholder }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="h-10"
    />
  );
}

function NumberInput({ value, onChange, onBlur, min, max }: ControlProps & { min?: number; max?: number }) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="number"
      inputMode="numeric"
      value={(value as number | string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      min={min}
      max={max}
      className="h-10 tabular-nums"
    />
  );
}

function DateInput({ value, onChange, onBlur }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="date"
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className="h-10"
    />
  );
}

function UrlInput({ value, onChange, onBlur }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="url"
      inputMode="url"
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder="https://…"
      className="h-10"
    />
  );
}

function TextAreaInput({ value, onChange, onBlur }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Textarea
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      rows={3}
    />
  );
}

function StatusSelect({
  value,
  onChange,
  children,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  children: React.ReactNode;
}) {
  const aria = useFieldAria();
  return (
    <Select value={value as string} onValueChange={onChange}>
      <SelectTrigger {...aria} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
