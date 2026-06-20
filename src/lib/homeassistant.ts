import type { SmartDevice, AutomationScene } from "./types";
import { smartDevices as mockDevices, automationScenes as mockScenes } from "./mock-data";

const HA_URL = process.env.NEXT_PUBLIC_HA_URL || "";
const HA_TOKEN = process.env.NEXT_PUBLIC_HA_TOKEN || "";

function isConnected(): boolean {
  return Boolean(HA_URL && HA_TOKEN);
}

async function haFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${HA_URL}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

export async function getDevices(): Promise<SmartDevice[]> {
  if (!isConnected()) return mockDevices;

  const states = await haFetch("/states");
  return states
    .filter((s: { entity_id: string }) => {
      const domain = s.entity_id.split(".")[0];
      return ["light", "switch", "lock", "climate", "sensor", "camera"].includes(domain);
    })
    .map(mapHAStateToDevice);
}

export async function toggleDevice(deviceId: string): Promise<SmartDevice> {
  const devices = await getDevices();
  const device = devices.find((d) => d.id === deviceId);
  if (!device) throw new Error("Device not found");

  if (!isConnected()) {
    const toggled = { ...device };
    if (device.type === "light" || device.type === "switch") {
      toggled.state = device.state === "on" ? "off" : "on";
    } else if (device.type === "lock") {
      toggled.state = device.state === "locked" ? "unlocked" : "locked";
    }
    return toggled;
  }

  const domain = device.type === "thermostat" ? "climate" : device.type;
  await haFetch(`/services/${domain}/toggle`, {
    method: "POST",
    body: JSON.stringify({ entity_id: deviceId }),
  });

  const updated = await haFetch(`/states/${deviceId}`);
  return mapHAStateToDevice(updated);
}

export async function activateScene(sceneId: string): Promise<void> {
  if (!isConnected()) return;

  await haFetch("/services/scene/turn_on", {
    method: "POST",
    body: JSON.stringify({ entity_id: sceneId }),
  });
}

export async function getScenes(): Promise<AutomationScene[]> {
  if (!isConnected()) return mockScenes;

  const states = await haFetch("/states");
  return states
    .filter((s: { entity_id: string }) => s.entity_id.startsWith("scene."))
    .map((s: { entity_id: string; attributes: { friendly_name?: string } }) => ({
      id: s.entity_id,
      name: s.attributes.friendly_name || s.entity_id,
      icon: "scene",
      description: "",
      deviceIds: [],
    }));
}

export async function setThermostat(deviceId: string, temperature: number): Promise<void> {
  if (!isConnected()) return;

  await haFetch("/services/climate/set_temperature", {
    method: "POST",
    body: JSON.stringify({
      entity_id: deviceId,
      temperature,
    }),
  });
}

function mapHAStateToDevice(state: {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}): SmartDevice {
  const domain = state.entity_id.split(".")[0];
  const typeMap: Record<string, SmartDevice["type"]> = {
    light: "light",
    switch: "switch",
    lock: "lock",
    climate: "thermostat",
    sensor: "sensor",
    camera: "camera",
  };

  return {
    id: state.entity_id,
    name: (state.attributes.friendly_name as string) || state.entity_id,
    type: typeMap[domain] || "sensor",
    state: state.state,
    room: (state.attributes.room as string) || "Unknown",
    attributes: state.attributes,
  };
}
