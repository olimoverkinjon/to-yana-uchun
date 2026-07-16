"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sessionQueryKey } from "@/features/auth";
import type { ActionResult, AppError } from "@/shared/lib/errors";

import {
  createEventAction,
  deleteEventAction,
  restoreEventAction,
  setEventStatusAction,
  updateEventAction,
} from "../api/event-actions";
import type { EventFormOutput, EventStatus } from "../schemas/event-schema";
import type { EventRow } from "../types";

import { eventKeys } from "./use-events";

/**
 * Server actions return a discriminated ActionResult rather than throwing, so
 * a Viewer hitting a forbidden action gets a typed error instead of a stack
 * trace. TanStack Query, though, decides success/failure by whether the
 * mutationFn throws — so unwrap here, once, and let every caller use
 * onError/isError normally.
 */
async function unwrap<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw result.error;
  return result.data;
}

export type { AppError };

/**
 * Invalidates everything a write to one event can affect. Lists and the
 * dashboard both derive from the same rows, and a status change can move an
 * event between filtered lists, so the whole `events` tree goes rather than
 * trying to predict which pages are still accurate.
 */
function useInvalidateEvents() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (id) void queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
  };
}

export function useCreateEventMutation() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (input: { values: EventFormOutput; reason?: string }) => unwrap(createEventAction(input)),
    onSuccess: (event) => invalidate(event.id),
  });
}

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (input: { id: string; values: EventFormOutput; reason?: string }) => unwrap(updateEventAction(input)),
    // Optimistic: the detail view is what the user is looking at while they
    // save, so it shows the new values immediately and rolls back if the
    // server disagrees.
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(id) });
      const previous = queryClient.getQueryData(eventKeys.detail(id));

      queryClient.setQueryData(eventKeys.detail(id), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        return {
          ...old,
          title: values.title,
          bride_name: values.brideName,
          groom_name: values.groomName,
          description: values.description,
          event_date: values.eventDate,
          event_year: values.eventYear,
          location: values.location,
          cover_image: values.coverImage,
          status: values.status,
        };
      });

      return { previous, id };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(eventKeys.detail(context.id), context.previous);
    },
    onSettled: (_data, _error, { id }) => invalidate(id),
  });
}

export function useSetEventStatusMutation() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (input: { id: string; status: EventStatus; reason?: string }) => unwrap(setEventStatusAction(input)),
    onSuccess: (event) => invalidate(event.id),
  });
}

export function useDeleteEventMutation() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => unwrap(deleteEventAction(input)),
    onSuccess: (event) => invalidate(event.id),
  });
}

export function useRestoreEventMutation() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => unwrap(restoreEventAction(input)),
    onSuccess: (event) => invalidate(event.id),
  });
}

/**
 * A role change (granted or revoked by a Super Admin) only reaches the client
 * on the next session fetch, so anything that could depend on permissions
 * refreshes it. Exported for the rare caller that needs it directly.
 */
export function useRefreshPermissions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });
}

export type { EventRow };
