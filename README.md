# Family Command Center

A smart home dashboard and family organizer built with Next.js, designed for wall-mounted tablets and mobile devices. Integrates with Home Assistant for home automation controls.

## Features

- **Weather Dashboard** - Current conditions and 5-day forecast (OpenWeatherMap or demo mode)
- **Family Calendar** - Shared calendar with color-coded events per family member
- **Chores & Tasks** - Assignable chore lists with points, completion tracking, and per-member filtering
- **Smart Home Controls** - Toggle lights, locks, and switches; activate automation scenes
- **Home Assistant Integration** - Connect to your HA instance or run in demo mode with mock data
- **PWA Support** - Installable as a standalone app on tablets and phones

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard in demo mode.

## Connecting to Home Assistant

1. Copy `.env.local.example` to `.env.local`
2. Set your Home Assistant URL and a Long-Lived Access Token
3. Optionally add an OpenWeatherMap API key for live weather
4. Restart the dev server

```env
NEXT_PUBLIC_HA_URL=http://192.168.1.100:8123
NEXT_PUBLIC_HA_TOKEN=your_long_lived_access_token
WEATHER_API_KEY=your_openweathermap_api_key
```

## Wall-Mounted Tablet Setup

The app is designed as a PWA. On your tablet:

1. Open the dashboard URL in Chrome/Safari
2. Tap "Add to Home Screen"
3. The app launches in fullscreen/standalone mode
4. Use the device's kiosk mode to prevent accidental navigation

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v4** for responsive design
- **Home Assistant REST API** for smart home integration
