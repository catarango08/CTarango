"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  activeLabel: string;
}

const actions: QuickAction[] = [
  { id: "guest_mode", label: "Guest Mode", icon: "👥", color: "bg-purple-500", activeLabel: "Guests Welcome" },
  { id: "vacation_mode", label: "Vacation", icon: "✈️", color: "bg-blue-500", activeLabel: "Away" },
  { id: "kids_bedtime", label: "Bedtime", icon: "🌙", color: "bg-indigo-500", activeLabel: "Lights Out" },
  { id: "panic", label: "Lock Down", icon: "🛡️", color: "bg-red-500", activeLabel: "Secured" },
];

export function QuickActions() {
  const [active, setActive] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const isActive = active.has(action.id);
          return (
            <button
              key={action.id}
              onClick={() => toggle(action.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all ${
                isActive
                  ? `${action.color} text-white shadow-lg scale-[0.98]`
                  : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium">
                {isActive ? action.activeLabel : action.label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
