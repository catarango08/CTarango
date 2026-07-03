"use client";

import { Header } from "@/components/layout/Header";
import { WidgetGrid } from "@/components/layout/WidgetGrid";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { ChoresWidget } from "@/components/widgets/ChoresWidget";
import { SmartHomeWidget } from "@/components/widgets/SmartHomeWidget";
import { QuickActions } from "@/components/widgets/QuickActions";
import { ConnectionStatus } from "@/components/widgets/ConnectionStatus";
import {
  familyMembers,
  calendarEvents,
  chores,
  weatherData,
} from "@/lib/mock-data";

export function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main className="flex-1">
        <WidgetGrid>
          <WeatherWidget data={weatherData} />
          <CalendarWidget events={calendarEvents} members={familyMembers} />
          <ChoresWidget chores={chores} members={familyMembers} />
          <SmartHomeWidget />
          <QuickActions />
        </WidgetGrid>
      </main>
      <footer className="flex items-center justify-center gap-3 px-4 py-3 sm:px-6">
        <span className="text-xs text-zinc-400 dark:text-zinc-600">
          Family Command Center
        </span>
        <ConnectionStatus />
      </footer>
    </div>
  );
}
