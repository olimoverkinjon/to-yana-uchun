"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReferenceData } from "@/features/reference-data";
import { FormField, useFieldAria } from "@/shared/components/form/form-field";

import {
  personalGiftSchema,
  type PersonalGiftFormOutput,
  type PersonalGiftFormValues,
} from "../schemas/personal-gift-schema";

interface PersonalGiftFormProps {
  isPending?: boolean;
  onSubmit: (values: PersonalGiftFormOutput) => void;
}

const NO_CURRENCY = "none";

export function PersonalGiftForm({ isPending = false, onSubmit }: PersonalGiftFormProps) {
  const t = useTranslations("personalGifts.form");
  const tCommon = useTranslations("common");
  const { currencies } = useReferenceData();

  const form = useForm<PersonalGiftFormValues, unknown, PersonalGiftFormOutput>({
    resolver: zodResolver(personalGiftSchema),
    defaultValues: {
      eventTitle: "",
      recipientName: "",
      amount: "",
      currencyId: null,
      description: "",
      giftDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
    mode: "onBlur",
  });

  return (
    <form
      className="bg-card/80 grid gap-3 rounded-2xl border p-4 shadow-sm"
      onSubmit={form.handleSubmit((values) => {
        onSubmit(values);
        form.reset({
          eventTitle: "",
          recipientName: "",
          amount: "",
          currencyId: null,
          description: "",
          giftDate: new Date().toISOString().slice(0, 10),
          notes: "",
        });
      })}
      noValidate
    >
      <FormField form={form} name="eventTitle" label={t("eventTitle")}>
        {(field) => <TextInput value={field.value} onChange={field.onChange} placeholder={t("eventPlaceholder")} />}
      </FormField>

      <FormField form={form} name="recipientName" label={t("recipientName")}>
        {(field) => <TextInput value={field.value} onChange={field.onChange} placeholder={t("recipientPlaceholder")} />}
      </FormField>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <FormField form={form} name="amount" label={t("amount")}>
          {(field) => <NumberInput value={field.value} onChange={field.onChange} placeholder="100" />}
        </FormField>

        <FormField form={form} name="currencyId" label={t("currency")}>
          {(field) => (
            <CurrencySelect value={(field.value as string | null) ?? null} onChange={field.onChange}>
              <SelectItem value={NO_CURRENCY}>—</SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code}
                </SelectItem>
              ))}
            </CurrencySelect>
          )}
        </FormField>
      </div>

      <FormField form={form} name="description" label={t("description")} description={t("descriptionHint")}>
        {(field) => (
          <TextInput value={field.value} onChange={field.onChange} placeholder={t("descriptionPlaceholder")} />
        )}
      </FormField>

      <FormField form={form} name="giftDate" label={t("giftDate")}>
        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
      </FormField>

      <FormField form={form} name="notes" label={t("notes")}>
        {(field) => <NotesInput value={field.value} onChange={field.onChange} placeholder={t("notesPlaceholder")} />}
      </FormField>

      <Button type="submit" disabled={isPending} className="h-10">
        {isPending ? tCommon("saving") : t("submit")}
      </Button>
    </form>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="number"
      inputMode="decimal"
      min={0}
      value={(value as string | number) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 tabular-nums"
    />
  );
}

function DateInput({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="date"
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className="h-10"
    />
  );
}

function NotesInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const aria = useFieldAria();
  return (
    <Textarea
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={2}
    />
  );
}

function CurrencySelect({
  value,
  onChange,
  children,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  children: React.ReactNode;
}) {
  const aria = useFieldAria();
  return (
    <Select value={value ?? NO_CURRENCY} onValueChange={(next) => onChange(next === NO_CURRENCY ? null : next)}>
      <SelectTrigger {...aria} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
