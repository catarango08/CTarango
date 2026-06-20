"use client";

import { Header } from "@/components/layout/Header";
import { WidgetGrid } from "@/components/layout/WidgetGrid";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { ChoresWidget } from "@/components/widgets/ChoresWidget";
import { SmartHomeWidget } from "@/components/widgets/SmartHomeWidget";
import {
  familyMembers,
  calendarEvents,
  chores,
  weatherData,
  smartDevices,
  automationScenes,
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
          <SmartHomeWidget devices={smartDevices} scenes={automationScenes} />
        </WidgetGrid>
      </main>
      <footer className="px-4 py-3 text-center text-xs text-zinc-400 dark:text-zinc-600 sm:px-6">
        Family Command Center &middot; Home Assistant{" "}
        {process.env.NEXT_PUBLIC_HA_URL ? "Connected" : "Demo Mode"}
      </footer>
    </div>
  );
}
