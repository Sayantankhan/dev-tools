import { useCallback, useEffect, useState } from "react";

const KEY = "devtools.recentTools";
const MAX = 5;

export function useRecentTools() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {}
  }, []);

  const push = useCallback((id: string) => {
    setRecents((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { recents, push };
}
