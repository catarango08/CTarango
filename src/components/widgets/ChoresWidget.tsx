"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Chore, FamilyMember } from "@/lib/types";

interface ChoresWidgetProps {
  chores: Chore[];
  members: FamilyMember[];
}

export function ChoresWidget({ chores: initialChores, members }: ChoresWidgetProps) {
  const [chores, setChores] = useState(initialChores);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? chores : chores.filter((c) => c.assigneeId === filter);
  const todayChores = filtered.filter(
    (c) => c.dueDate === new Date().toISOString().split("T")[0]
  );
  const completedCount = todayChores.filter((c) => c.completed).length;
  const totalPoints = chores.reduce((sum, c) => (c.completed ? sum + c.points : sum), 0);

  function toggleChore(id: string) {
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chores & Tasks</CardTitle>
        <span className="text-xs text-zinc-400">
          {completedCount}/{todayChores.length} done today
        </span>
      </CardHeader>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterButton>
        {members.map((m) => (
          <FilterButton
            key={m.id}
            active={filter === m.id}
            onClick={() => setFilter(m.id)}
          >
            {m.avatar} {m.name}
          </FilterButton>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {todayChores.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-400">No chores for today!</p>
        )}
        {todayChores.map((chore) => {
          const member = members.find((m) => m.id === chore.assigneeId);
          return (
            <button
              key={chore.id}
              onClick={() => toggleChore(chore.id)}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  chore.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {chore.completed && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className={`flex-1 text-sm ${
                  chore.completed
                    ? "text-zinc-400 line-through dark:text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {chore.title}
              </span>
              <span className="text-xs" style={{ color: member?.color }}>
                {member?.avatar}
              </span>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {chore.points} pts
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-zinc-400">Points earned today</span>
        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
          {totalPoints} pts
        </span>
      </div>
    </Card>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}
