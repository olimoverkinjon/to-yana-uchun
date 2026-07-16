"use client";

import { useTranslations } from "next-intl";
import { createContext, useContext, useId, type ReactNode } from "react";
import {
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Minimal react-hook-form field primitives.
 *
 * The component style this project uses does not ship shadcn's `form`
 * wrapper, and adding it would overwrite the existing label/input. These
 * cover what the event and gift forms actually need — accessible wiring
 * (label ↔ control ↔ error via aria-describedby / aria-invalid) and one place
 * that decides how an error looks — without a second component vocabulary.
 *
 * The `form` instance is passed per field rather than read from a
 * FormProvider: these forms are single-component, so threading a context
 * through only to read it back adds indirection without removing any.
 */

interface FieldContextValue {
  id: string;
  errorId: string;
  descriptionId: string;
  hasError: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Accessibility props to spread onto whatever control a field wraps. */
export function useFieldAria() {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("useFieldAria must be used inside <FormField>");

  return {
    id: ctx.id,
    "aria-invalid": ctx.hasError || undefined,
    "aria-describedby": ctx.hasError ? ctx.errorId : ctx.descriptionId,
  };
}

interface FormFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  form: UseFormReturn<TValues>;
  name: TName;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
  children: (field: ControllerRenderProps<TValues, TName>) => ReactNode;
}

export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  form,
  name,
  label,
  description,
  className,
  children,
}: FormFieldProps<TValues, TName>) {
  const id = useId();
  const t = useTranslations();

  // Nested paths (`a.b`) need a walk rather than a plain index lookup.
  const error = name.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, form.formState.errors);

  const raw = (error as { message?: string } | undefined)?.message;
  // The Zod schemas emit i18n keys ("validation.titleRequired") rather than
  // sentences, so they stay usable on the server where there is no locale
  // context to read. Translating here — once, for every form — is what turns
  // a key back into the user's language. Anything not shaped like a key is
  // shown as-is, so a message is never swallowed.
  const message = raw?.startsWith("validation.") ? t(raw) : raw;
  const hasError = Boolean(message);

  const context: FieldContextValue = {
    id,
    errorId: `${id}-error`,
    descriptionId: `${id}-description`,
    hasError,
  };

  return (
    <FieldContext.Provider value={context}>
      <div className={cn("space-y-1.5", className)}>
        {label ? (
          <Label htmlFor={id} className={cn(hasError && "text-destructive")}>
            {label}
          </Label>
        ) : null}

        <Controller control={form.control} name={name} render={({ field }) => <>{children(field)}</>} />

        {description && !hasError ? (
          <p id={context.descriptionId} className="text-muted-foreground text-xs">
            {description}
          </p>
        ) : null}

        {message ? (
          <p id={context.errorId} role="alert" className="text-destructive text-xs font-medium">
            {message}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
