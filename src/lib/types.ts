export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  memberId: string;
  category: "school" | "work" | "appointment" | "activity" | "family";
  location?: string;
}

export interface Chore {
  id: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  completed: boolean;
  recurring: "daily" | "weekly" | "monthly" | "once";
  points: number;
}

export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
  };
  forecast: WeatherForecast[];
  location: string;
}

export interface WeatherForecast {
  day: string;
  high: number;
  low: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface SmartDevice {
  id: string;
  name: string;
  type: "light" | "thermostat" | "lock" | "switch" | "sensor" | "camera";
  state: string;
  room: string;
  attributes: Record<string, unknown>;
}

export interface AutomationScene {
  id: string;
  name: string;
  icon: string;
  description: string;
  deviceIds: string[];
}

export interface HomeAssistantConfig {
  url: string;
  token: string;
  connected: boolean;
}
