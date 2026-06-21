"use client";

import { useState, useEffect } from "react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "demo">("checking");
  const haUrl = process.env.NEXT_PUBLIC_HA_URL;

  useEffect(() => {
    if (!haUrl) {
      setStatus("demo");
      return;
    }

    fetch(`${haUrl}/api/`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HA_TOKEN || ""}`,
      },
    })
      .then((res) => setStatus(res.ok ? "connected" : "demo"))
      .catch(() => setStatus("demo"));
  }, [haUrl]);

  if (status === "checking") return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        status === "connected"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "connected" ? "bg-green-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      {status === "connected" ? "HA Connected" : "Demo Mode"}
    </div>
  );
}
