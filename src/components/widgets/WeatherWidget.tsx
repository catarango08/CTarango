"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { WeatherData } from "@/lib/types";

const weatherIcons: Record<string, string> = {
  sunny: "☀️",
  "partly-cloudy": "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  storm: "⛈️",
  snow: "❄️",
  fog: "🌫️",
};

interface WeatherWidgetProps {
  data: WeatherData;
}

export function WeatherWidget({ data }: WeatherWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather</CardTitle>
        <span className="text-xs text-zinc-400">{data.location}</span>
      </CardHeader>

      <div className="mb-5 flex items-center gap-4">
        <span className="text-5xl">{weatherIcons[data.current.icon] || "☀️"}</span>
        <div>
          <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.current.temp}°F
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.current.description}
          </p>
        </div>
        <div className="ml-auto text-right text-xs text-zinc-400 dark:text-zinc-500">
          <p>Feels like {data.current.feelsLike}°F</p>
          <p>Humidity {data.current.humidity}%</p>
          <p>Wind {data.current.windSpeed} mph</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {data.forecast.map((day) => (
          <div key={day.day} className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {day.day}
            </span>
            <span className="text-lg">{weatherIcons[day.icon] || "☀️"}</span>
            <div className="text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{day.high}°</span>
              <span className="text-zinc-400"> / {day.low}°</span>
            </div>
            {day.precipitation > 20 && (
              <span className="text-[10px] text-blue-500">{day.precipitation}%</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
