"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSessionQuery } from "@/features/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { listPersonalGifts } from "../api/personal-gifts-repository";
import type { PersonalGiftFormOutput } from "../schemas/personal-gift-schema";
import type { PersonalGiftInsert } from "../types";

export const personalGiftKeys = {
  all: ["personal-gifts"] as const,
};

export function usePersonalGiftsQuery() {
  return useQuery({
    queryKey: personalGiftKeys.all,
    queryFn: () => listPersonalGifts(createSupabaseBrowserClient()),
  });
}

export function useCreatePersonalGiftMutation() {
  const queryClient = useQueryClient();
  const session = useSessionQuery();

  return useMutation({
    mutationFn: async (values: PersonalGiftFormOutput) => {
      const profileId = session.data?.user?.profileId;
      if (!profileId) throw new Error("unauthenticated");

      const payload: PersonalGiftInsert = {
        user_id: profileId,
        event_title: values.eventTitle,
        recipient_name: values.recipientName,
        amount: values.amount,
        currency_id: values.currencyId,
        description: values.description,
        gift_date: values.giftDate,
        notes: values.notes,
      };

      const { error } = await createSupabaseBrowserClient().from("personal_gifts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personalGiftKeys.all }),
  });
}

export function useDeletePersonalGiftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createSupabaseBrowserClient()
        .from("personal_gifts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personalGiftKeys.all }),
  });
}

export function useRestorePersonalGiftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createSupabaseBrowserClient()
        .from("personal_gifts")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personalGiftKeys.all }),
  });
}
