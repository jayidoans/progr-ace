"use client";

import { useEffect, useState } from "react";

export function LocalSyncTime({ value }: { value: string }) {
  const [label, setLabel] = useState("Loading…");

  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value)),
    );
  }, [value]);

  return <time dateTime={value}>{label}</time>;
}
