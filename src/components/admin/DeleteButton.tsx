"use client";

import { useTransition } from "react";

interface Props {
  /** A server action already bound to the row id, e.g. deletePlayer.bind(null, id). */
  action: () => Promise<void>;
  /** Used in the confirmation prompt, e.g. the player's name. */
  itemName: string;
}

export function DeleteButton({ action, itemName }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-danger min-h-[36px] px-3 py-1"
      onClick={() => {
        if (window.confirm(`Delete "${itemName}"? This cannot be undone.`)) {
          startTransition(async () => {
            await action();
          });
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
