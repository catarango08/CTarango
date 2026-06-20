"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SmartDevice, AutomationScene } from "@/lib/types";

const deviceIcons: Record<string, string> = {
  light: "💡",
  thermostat: "🌡️",
  lock: "🔒",
  switch: "🔘",
  sensor: "📡",
  camera: "📷",
};

const sceneIcons: Record<string, string> = {
  sunrise: "🌅",
  moon: "🌙",
  film: "🎬",
  shield: "🛡️",
};

interface SmartHomeWidgetProps {
  devices: SmartDevice[];
  scenes: AutomationScene[];
}

export function SmartHomeWidget({ devices: initialDevices, scenes }: SmartHomeWidgetProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [view, setView] = useState<"devices" | "scenes">("devices");
  const [activeScene, setActiveScene] = useState<string | null>(null);

  const rooms = [...new Set(devices.map((d) => d.room))];
  const activeCount = devices.filter(
    (d) => d.state === "on" || d.state === "locked" || d.state === "cooling"
  ).length;

  function handleToggle(deviceId: string) {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== deviceId) return d;
        const toggled = { ...d };
        if (d.type === "light" || d.type === "switch") {
          toggled.state = d.state === "on" ? "off" : "on";
        } else if (d.type === "lock") {
          toggled.state = d.state === "locked" ? "unlocked" : "locked";
        }
        return toggled;
      })
    );
  }

  function handleScene(sceneId: string) {
    setActiveScene(sceneId);
    setTimeout(() => setActiveScene(null), 2000);
  }

  return (
    <Card className="xl:row-span-2">
      <CardHeader>
        <CardTitle>Smart Home</CardTitle>
        <span className="text-xs text-zinc-400">{activeCount} active</span>
      </CardHeader>

      <div className="mb-4 flex gap-1.5">
        <button
          onClick={() => setView("devices")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            view === "devices"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Devices
        </button>
        <button
          onClick={() => setView("scenes")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            view === "scenes"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Scenes
        </button>
      </div>

      {view === "devices" ? (
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {rooms.map((room) => (
            <div key={room}>
              <p className="mb-2 text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                {room}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {devices
                  .filter((d) => d.room === room)
                  .map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      onToggle={() => handleToggle(device.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => handleScene(scene.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                activeScene === scene.id
                  ? "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-900/20"
                  : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-2xl">{sceneIcons[scene.icon] || "⚙️"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {scene.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{scene.description}</p>
              </div>
              {activeScene === scene.id ? (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Activated!
                </span>
              ) : (
                <Button variant="ghost" size="sm">
                  Run
                </Button>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function DeviceCard({
  device,
  onToggle,
}: {
  device: SmartDevice;
  onToggle: () => void;
}) {
  const isActive =
    device.state === "on" || device.state === "locked" || device.state === "cooling";
  const isToggleable = ["light", "switch", "lock"].includes(device.type);

  return (
    <button
      onClick={isToggleable ? onToggle : undefined}
      disabled={!isToggleable}
      className={`flex flex-col gap-1.5 rounded-xl p-3 text-left transition-all ${
        isActive
          ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
          : "bg-zinc-50 dark:bg-zinc-800/50"
      } ${isToggleable ? "cursor-pointer hover:ring-2 hover:ring-blue-300" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{deviceIcons[device.type]}</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isActive ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        />
      </div>
      <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
        {device.name}
      </p>
      <p className="text-[10px] text-zinc-400 capitalize">
        {device.type === "thermostat"
          ? `${(device.attributes.current_temp as number) ?? ""}° / ${(device.attributes.target_temp as number) ?? ""}°`
          : device.state}
      </p>
    </button>
  );
}
