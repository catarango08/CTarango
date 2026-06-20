"use client";

import { useState, useEffect } from "react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting(time.getHours());
  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <header className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {greeting}, Tarango Family
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formattedDate}</p>
      </div>
      <div className="text-right">
        <p className="text-3xl font-light tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          {formattedTime}
        </p>
      </div>
    </header>
  );
}

function getGreeting(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
