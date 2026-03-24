import { useState, useCallback, useEffect } from "react";

const MAX_ITEMS = 10;

export function useHistory(storageKey: string) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const add = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setItems((prev) => {
        const next = [trimmed, ...prev.filter((v) => v !== trimmed)].slice(
          0,
          MAX_ITEMS,
        );
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  return { items, add };
}
