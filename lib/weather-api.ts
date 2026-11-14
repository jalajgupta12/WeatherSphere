export type Place = { name: string; admin1?: string; country: string; latitude: number; longitude: number; timezone?: string };
export type ForecastData = {
  timezone: string;
  current: { time: string; temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; is_day: number; precipitation: number; rain: number; showers: number; weather_code: number; cloud_cover: number; pressure_msl: number; surface_pressure: number; wind_speed_10m: number; wind_direction_10m: number; uv_index: number; dew_point_2m: number; visibility?: number };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[]; wind_speed_10m: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[] };
};
export type AirData = { current: { time: string; us_aqi?: number; pm2_5?: number; pm10?: number; carbon_monoxide?: number; nitrogen_dioxide?: number; ozone?: number } };
const BASE = "https://api.open-meteo.com/v1/forecast";
async function readJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Weather service returned ${response.status}. Please try again.`);
  return response.json() as Promise<T>;
}
export async function fetchForecast(place: Place): Promise<ForecastData> {
  const params = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), timezone: place.timezone || "auto", forecast_days: "7", forecast_hours: "48", current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index,dew_point_2m,visibility", hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset", wind_speed_unit: "kmh" });
  return readJson<ForecastData>(`${BASE}?${params}`);
}
export async function fetchAirQuality(place: Place): Promise<AirData> {
  const params = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), timezone: place.timezone || "auto", current: "us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone" });
  return readJson<AirData>(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
}
export async function geocodeCity(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (query.length < 2 || query.length > 100) return [];
  const params = new URLSearchParams({ name: query, count: "8", language: "en", format: "json" });
  const data = await readJson<{ results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }> }>(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal);
  return (data.results ?? []).map(x => ({ name: x.name, admin1: x.admin1, country: x.country ?? "Unknown country", latitude: x.latitude, longitude: x.longitude, timezone: x.timezone ?? "auto" }));
}
