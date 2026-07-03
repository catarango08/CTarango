"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CalendarEvent, FamilyMember } from "@/lib/types";

const categoryColors: Record<string, string> = {
  school: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  work: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  appointment: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  activity: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  family: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface CalendarWidgetProps {
  events: CalendarEvent[];
  members: FamilyMember[];
}

export function CalendarWidget({ events, members }: CalendarWidgetProps) {
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.end) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const grouped = groupByDay(upcoming);

  return (
    <Card className="xl:row-span-2">
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <span className="text-xs text-zinc-400">{upcoming.length} upcoming</span>
      </CardHeader>

      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([label, dayEvents]) => (
          <div key={label}>
            <p className="mb-2 text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
              {label}
            </p>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const member = members.find((m) => m.id === event.memberId);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50"
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: member?.color + "22", color: member?.color }}
                    >
                      {member?.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {event.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(event.start)} - {formatTime(event.end)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[event.category]}`}
                    >
                      {event.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const groups: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);

    let label: string;
    if (eventDate.getTime() === today.getTime()) {
      label = "Today";
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      label = "Tomorrow";
    } else {
      label = eventDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  }

  return groups;
}
