"use client";

import { useEffect } from "react";

import { onMainButtonClick, setMainButtonParams } from "@telegram-apps/sdk-react";

export interface TelegramMainButtonOptions {
  text: string;
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * Declaratively drives Telegram's native Main Button from a page — e.g. a
 * future "Add Gift" form sets `{ text: t('save'), onClick: submit }` and
 * the hook takes care of mounting/unmounting the click listener.
 */
export function useTelegramMainButton({
  text,
  visible = true,
  disabled = false,
  loading = false,
  onClick,
}: TelegramMainButtonOptions) {
  useEffect(() => {
    if (!setMainButtonParams.isAvailable()) return;
    setMainButtonParams({
      text,
      isVisible: visible,
      isEnabled: !disabled,
      isLoaderVisible: loading,
    });
  }, [text, visible, disabled, loading]);

  useEffect(() => {
    if (!onClick || !onMainButtonClick.isAvailable()) return;
    return onMainButtonClick(onClick);
  }, [onClick]);
}
