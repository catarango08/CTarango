import { NextResponse } from "next/server";
import { weatherData } from "@/lib/mock-data";

export async function GET() {
  const apiKey = process.env.WEATHER_API_KEY;
  const lat = process.env.WEATHER_LAT || "29.4241";
  const lon = process.env.WEATHER_LON || "-98.4936";

  if (!apiKey) {
    return NextResponse.json(weatherData);
  }

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=imperial&appid=${encodeURIComponent(apiKey)}`,
    { next: { revalidate: 900 } }
  );

  if (!res.ok) {
    return NextResponse.json(weatherData);
  }

  const data = await res.json();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return NextResponse.json({
    location: "San Antonio, TX",
    current: {
      temp: Math.round(data.current.temp),
      feelsLike: Math.round(data.current.feels_like),
      humidity: data.current.humidity,
      description: data.current.weather[0].main,
      icon: mapIcon(data.current.weather[0].icon),
      windSpeed: Math.round(data.current.wind_speed),
    },
    forecast: data.daily.slice(0, 5).map((d: { dt: number; temp: { max: number; min: number }; weather: { main: string; icon: string }[]; pop: number }) => ({
      day: days[new Date(d.dt * 1000).getDay()],
      high: Math.round(d.temp.max),
      low: Math.round(d.temp.min),
      description: d.weather[0].main,
      icon: mapIcon(d.weather[0].icon),
      precipitation: Math.round(d.pop * 100),
    })),
  });
}

function mapIcon(owmIcon: string): string {
  const map: Record<string, string> = {
    "01d": "sunny",
    "01n": "sunny",
    "02d": "partly-cloudy",
    "02n": "partly-cloudy",
    "03d": "cloudy",
    "03n": "cloudy",
    "04d": "cloudy",
    "04n": "cloudy",
    "09d": "rain",
    "09n": "rain",
    "10d": "rain",
    "10n": "rain",
    "11d": "storm",
    "11n": "storm",
    "13d": "snow",
    "13n": "snow",
    "50d": "fog",
    "50n": "fog",
  };
  return map[owmIcon] || "sunny";
}
