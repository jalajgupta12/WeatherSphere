# WeatherSphere

A responsive, live-data weather dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Lucide icons and Recharts. Weather and air-quality data are retrieved from Open-Meteo; no API key is required.

## Requirements
- Node.js 20.9+
- npm 10+

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Production build
```bash
npm run build
npm start
```

## Deploy to Vercel
1. Create a GitHub repository and push this project.
2. Import the repository in Vercel.
3. Keep the framework preset as Next.js and deploy. No environment variables are required for the public Open-Meteo endpoints.

## Features
- Mathura, Uttar Pradesh is the initial location.
- Worldwide city search using Open-Meteo Geocoding.
- Browser geolocation (only after permission is granted).
- Current conditions, 24-hour outlook, 7-day forecast and interactive temperature/precipitation charts.
- Air-quality metrics and plain-language AQI guidance.
- Saved locations in local storage, °C/°F and km/h/mph controls, dark/light theme and refresh.
- Graceful loading, API errors and unavailable-data states.

## Data notes
Forecasts and air-quality measurements are live Open-Meteo responses. Weather alerts and map tiles are not fabricated: the dashboard explicitly reports that an official alert feed/map provider is not configured. Visibility, dew point and other values are shown only when returned by the API.

Weather data by [Open-Meteo.com](https://open-meteo.com).
