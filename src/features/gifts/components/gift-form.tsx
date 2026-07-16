"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useReferenceData } from "@/features/reference-data";
import { FormField, useFieldAria } from "@/shared/components/form/form-field";

import { buildGiftSchema, giftFieldVisibility, type GiftFormOutput, type GiftFormValues } from "../schemas/gift-schema";
import type { GiftWithRelations } from "../types";

interface GiftFormProps {
  gift?: GiftWithRelations | null;
  isPending?: boolean;
  onSubmit: (values: GiftFormOutput, meta: { giftTypeId: string; currencyId: string | null }) => void;
  onCancel: () => void;
}

function toDefaults(gift?: GiftWithRelations | null): GiftFormValues {
  return {
    giverName: gift?.giver_name ?? "",
    giftTypeId: gift?.gift_type_id ?? "",
    amount: gift?.amount ?? "",
    currencyId: gift?.currency_id ?? null,
    weight: gift?.weight ?? "",
    unit: gift?.unit ?? "",
    description: gift?.description ?? "",
    giftDate: gift?.gift_date ?? new Date().toISOString().slice(0, 10),
    notes: gift?.notes ?? "",
  };
}

/**
 * The gift form, whose shape follows the selected gift type.
 *
 * Cash asks for an amount and a currency and never mentions weight; a cow asks
 * for a weight and a unit and never mentions an amount. None of that is
 * hardcoded here — gift_types carries requires_amount / requires_currency /
 * requires_weight, and both the visible fields and the validation schema are
 * derived from those flags. The same flags drive the validate_gift_fields
 * trigger in the database, so a Super Admin adding a "Car" category next year
 * gets a correct form and correct enforcement without anyone touching this
 * file.
 */
export function GiftForm({ gift, isPending = false, onSubmit, onCancel }: GiftFormProps) {
  const t = useTranslations("gifts.fields");
  const tCommon = useTranslations("common");
  const { giftTypes, currencies, giftTypeById, isLoading } = useReferenceData();

  const schema = useMemo(() => buildGiftSchema(giftTypes), [giftTypes]);

  const form = useForm<GiftFormValues, unknown, GiftFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(gift),
    mode: "onBlur",
  });

  const selectedTypeId = form.watch("giftTypeId");
  const selectedType = giftTypeById.get(selectedTypeId ?? "");
  const visibility = giftFieldVisibility(selectedType);

  /**
   * Clear values that the newly-chosen type does not collect. Without this, a
   * user who typed an amount, then switched from Cash to Cow, would silently
   * submit an amount on a livestock record — the field is no longer on screen
   * to correct, and the amount/currency CHECK constraint would reject the
   * write with an error pointing at nothing the user can see.
   */
  useEffect(() => {
    if (!selectedType) return;

    if (!visibility.amount) form.setValue("amount", "", { shouldValidate: false });
    if (!visibility.currency) form.setValue("currencyId", null, { shouldValidate: false });
    if (!visibility.weight) form.setValue("weight", "", { shouldValidate: false });
    if (!visibility.unit) form.setValue("unit", "", { shouldValidate: false });
    // form is stable; visibility is derived from selectedType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType?.id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const handleSubmit = form.handleSubmit((values) =>
    onSubmit(values, { giftTypeId: values.giftTypeId, currencyId: values.currencyId }),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
      <FormField form={form} name="giverName" label={t("giverName")}>
        {(field) => (
          <TextControl
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={t("giverNamePlaceholder")}
            // The first field of a form used repeatedly with a queue of guests
            // waiting — it should be ready to type into.
            autoFocus={!gift}
          />
        )}
      </FormField>

      <FormField form={form} name="giftTypeId" label={t("giftType")}>
        {(field) => (
          <SelectControl
            value={field.value}
            onChange={field.onChange}
            placeholder={t("giftTypePlaceholder")}
            options={giftTypes.map((type) => ({ value: type.id, label: type.name }))}
          />
        )}
      </FormField>

      {/*
        Fields animate in and out as the type changes, so it is visible that
        the form responded to the choice rather than silently rearranging.
      */}
      <AnimatePresence initial={false} mode="popLayout">
        {visibility.amount || visibility.currency ? (
          <Reveal key="money">
            <div className="grid gap-4 sm:grid-cols-2">
              {visibility.amount ? (
                <FormField form={form} name="amount" label={t("amount")}>
                  {(field) => (
                    <NumberControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} step="0.01" />
                  )}
                </FormField>
              ) : null}

              {visibility.currency ? (
                <FormField form={form} name="currencyId" label={t("currency")}>
                  {(field) => (
                    <SelectControl
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("currencyPlaceholder")}
                      options={currencies.map((currency) => ({
                        value: currency.id,
                        label: currency.symbol ? `${currency.code} (${currency.symbol})` : currency.code,
                      }))}
                    />
                  )}
                </FormField>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        {visibility.weight ? (
          <Reveal key="measure">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField form={form} name="weight" label={t("weight")}>
                {(field) => (
                  <NumberControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} step="0.001" />
                )}
              </FormField>

              <FormField form={form} name="unit" label={t("unit")}>
                {(field) => (
                  <TextControl
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t("unitPlaceholder")}
                  />
                )}
              </FormField>
            </div>
          </Reveal>
        ) : null}
      </AnimatePresence>

      <FormField
        form={form}
        name="description"
        label={t("description")}
        description={visibility.descriptionRequired ? undefined : tCommon("optional")}
      >
        {(field) => (
          <TextControl
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={t("descriptionPlaceholder")}
          />
        )}
      </FormField>

      <FormField form={form} name="giftDate" label={t("giftDate")}>
        {(field) => <DateControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
      </FormField>

      <FormField form={form} name="notes" label={t("notes")} description={tCommon("optional")}>
        {(field) => <TextAreaControl value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
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

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

interface ControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function TextControl({ value, onChange, onBlur, placeholder, autoFocus }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="h-10"
    />
  );
}

function NumberControl({ value, onChange, onBlur, step }: ControlProps & { step?: string }) {
  const aria = useFieldAria();
  return (
    <Input
      {...aria}
      type="number"
      // "decimal" rather than "numeric": an amount can have a fractional part,
      // and this is the keypad that offers a separator on a phone.
      inputMode="decimal"
      step={step}
      min={0}
      value={(value as string | number) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className="h-10 tabular-nums"
    />
  );
}

function DateControl({ value, onChange, onBlur }: ControlProps) {
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

function TextAreaControl({ value, onChange, onBlur }: ControlProps) {
  const aria = useFieldAria();
  return (
    <Textarea
      {...aria}
      value={(value as string) ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      rows={2}
    />
  );
}

function SelectControl({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  const aria = useFieldAria();
  return (
    <Select value={(value as string) ?? ""} onValueChange={onChange}>
      <SelectTrigger {...aria} className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
