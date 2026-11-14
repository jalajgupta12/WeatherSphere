"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, Cloud,
  CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Compass, Droplets, Gauge, Globe2, Heart, LocateFixed, MapPin, Moon,
  RefreshCw, Search, Sun, Sunrise, Sunset, Thermometer, Umbrella, Wind,
  X, Eye, Sparkles, Menu
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart
} from "recharts";
import { fetchAirQuality, fetchForecast, geocodeCity, type AirData, type ForecastData, type Place } from "@/lib/weather-api";
import { describeWeather, weatherIcon } from "@/lib/weather-codes";

type Units = "c" | "f";
type WindUnits = "kmh" | "mph";
const DEFAULT_PLACE: Place = { name: "Mathura", admin1: "Uttar Pradesh", country: "India", latitude: 27.4924, longitude: 77.6737, timezone: "Asia/Kolkata" };
const cx = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(" ");
const num = (v: number | null | undefined, digits = 0) => v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
const temp = (v: number | null | undefined, unit: Units) => v == null ? "—" : `${Math.round(unit === "f" ? v * 9 / 5 + 32 : v)}°`;
const wind = (v: number | null | undefined, unit: WindUnits) => v == null ? "—" : `${Math.round(unit === "mph" ? v * .621371 : v)} ${unit}`;
const localDate = (value: string, timezone: string, opts: Intl.DateTimeFormatOptions) => {
  try { return new Intl.DateTimeFormat("en-IN", { timeZone: timezone, ...opts }).format(new Date(value)); } catch { return value; }
};

function WeatherGlyph({ code, size = 34 }: { code: number; size?: number }) {
  const Icon = weatherIcon(code);
  return <Icon size={size} strokeWidth={1.65} className="weather-glyph" />;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cx("glass-card", className)}>{children}</section>;
}
function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail?: string }) {
  return <Card className="metric-card"><div className="metric-top"><span className="metric-icon"><Icon size={17}/></span><span>{label}</span></div><div className="metric-value">{value}</div>{detail && <div className="metric-detail">{detail}</div>}</Card>;
}
function AQIInfo({ aqi }: { aqi: number | null }) {
  if (aqi == null) return { label: "Unavailable", advice: "Air-quality data is not currently available.", color: "muted" };
  if (aqi <= 20) return { label: "Good", advice: "Air quality is good. Enjoy your usual outdoor activities.", color: "good" };
  if (aqi <= 40) return { label: "Fair", advice: "Air quality is acceptable for most people.", color: "fair" };
  if (aqi <= 60) return { label: "Moderate", advice: "Sensitive individuals may consider reducing prolonged outdoor exertion.", color: "moderate" };
  if (aqi <= 80) return { label: "Poor", advice: "People with respiratory or heart conditions should limit prolonged outdoor exertion.", color: "poor" };
  if (aqi <= 100) return { label: "Very poor", advice: "Reduce outdoor activity, especially if you are sensitive to air pollution.", color: "very-poor" };
  return { label: "Extremely poor", advice: "Avoid strenuous outdoor activity. Keep windows closed where practical.", color: "hazardous" };
}

export default function Home() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [units, setUnits] = useState<Units>("c");
  const [windUnits, setWindUnits] = useState<WindUnits>("kmh");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saved, setSaved] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [airLoading, setAirLoading] = useState(true);
  const [error, setError] = useState("");
  const [airError, setAirError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(new Date());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("weathersphere-favourites"); if (s) setSaved(JSON.parse(s)); } catch { /* ignore invalid local data */ }
    const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const load = useCallback(async (target: Place) => {
    setLoading(true); setAirLoading(true); setError(""); setAirError("");
    const [f, a] = await Promise.allSettled([fetchForecast(target), fetchAirQuality(target)]);
    if (f.status === "fulfilled") { setForecast(f.value); setUpdatedAt(new Date()); }
    else { setForecast(null); setError(f.reason instanceof Error ? f.reason.message : "Unable to load weather data."); }
    if (a.status === "fulfilled") setAir(a.value);
    else { setAir(null); setAirError(a.reason instanceof Error ? a.reason.message : "Air-quality data is unavailable."); }
    setLoading(false); setAirLoading(false);
  }, []);
  useEffect(() => { void load(place); }, [place, load]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => { try { setResults(await geocodeCity(query.trim(), controller.signal)); } catch { if (!controller.signal.aborted) setResults([]); } }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const current = forecast?.current;
  const daily = forecast?.daily;
  const hourly = forecast?.hourly;
  const condition = current ? describeWeather(current.weather_code) : "Loading conditions";
  const aqiValue = air?.current?.us_aqi ?? null;
  const aqi = AQIInfo({ aqi: aqiValue });
  const hourRows = useMemo(() => {
    if (!hourly || !forecast) return [];
    const start = Math.max(0, hourly.time.findIndex(t => t >= forecast.current.time));
    return hourly.time.slice(start, start + 24).map((time, i) => ({
      time, label: i === 0 ? "Now" : localDate(time, forecast.timezone, { hour: "numeric" }),
      temperature: hourly.temperature_2m[start + i], rain: hourly.precipitation_probability[start + i] ?? 0,
      code: hourly.weather_code[start + i], wind: hourly.wind_speed_10m[start + i]
    }));
  }, [hourly, forecast]);
  const chartRows = useMemo(() => hourRows.slice(0, 12).map(x => ({ ...x, displayTemp: units === "f" ? x.temperature * 9 / 5 + 32 : x.temperature })), [hourRows, units]);

  const choosePlace = (p: Place) => { setPlace(p); setQuery(""); setResults([]); setSearchOpen(false); };
  const toggleSaved = () => {
    const exists = saved.some(p => p.latitude === place.latitude && p.longitude === place.longitude);
    const next = exists ? saved.filter(p => !(p.latitude === place.latitude && p.longitude === place.longitude)) : [...saved, place];
    setSaved(next); try { localStorage.setItem("weathersphere-favourites", JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const locate = () => {
    if (!navigator.geolocation) { setError("Your browser does not support location detection."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try { const p: Place = { name: "Current location", admin1: "", country: "Detected location", latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: "auto" }; choosePlace(p); }
      finally { setLocating(false); }
    }, err => { setError(err.code === 1 ? "Location permission was denied. You can search for a city instead." : "Could not detect your location."); setLocating(false); }, { enableHighAccuracy: false, timeout: 10000 });
  };
  const isSaved = saved.some(p => p.latitude === place.latitude && p.longitude === place.longitude);

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><CloudSun size={21}/></span><span>weather<span className="brand-accent">sphere</span></span></a>
      <div className="top-actions">
        <div className="search-wrap">
          <Search size={17}/><input ref={searchRef} value={query} onFocus={() => setSearchOpen(true)} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} placeholder="Search city or region..." aria-label="Search city"/>
          {query && <button className="icon-button" onClick={() => { setQuery(""); setResults([]); }} aria-label="Clear search"><X size={15}/></button>}
          {searchOpen && query.trim().length >= 2 && <div className="search-results">{results.length ? results.map((p, i) => <button key={`${p.latitude}-${p.longitude}-${i}`} onClick={() => choosePlace(p)}><MapPin size={15}/><span><b>{p.name}</b><small>{[p.admin1, p.country].filter(Boolean).join(", ")}</small></span></button>) : <div className="search-empty">Searching locations…</div>}</div>}
        </div>
        <button className="icon-button location-button" onClick={locate} disabled={locating} title="Use current location"><LocateFixed size={18}/></button>
        <button className="icon-button theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
      </div>
    </header>
    <div className="main-content" onClick={() => searchOpen && setSearchOpen(false)}>
      <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> LIVE WEATHER OVERVIEW</div><h1>Your weather, <em>in focus.</em></h1><p className="subheading">A clearer view of the day ahead.</p></div><button className="refresh-button" onClick={() => void load(place)} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> <span>Refresh</span></button></div>
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => void load(place)}>Try again</button></div>}
      <div className="dashboard-grid">
        <Card className="hero-card">
          <div className="hero-top"><div><div className="location-line"><MapPin size={15}/>{place.name}{place.admin1 ? `, ${place.admin1}` : ""}</div><div className="country-line">{place.country} <span>·</span> {forecast ? localDate(current!.time, forecast.timezone, { weekday: "long", month: "long", day: "numeric" }) : "Local forecast"}</div></div><button className={cx("favourite-button", isSaved && "active")} onClick={toggleSaved} aria-label="Save favourite"><Heart size={18} fill={isSaved ? "currentColor" : "none"}/></button></div>
          <div className="hero-weather">{loading ? <div className="temperature-skeleton"/> : <><div className="hero-temp">{temp(current?.temperature_2m, units)}<span>{units === "c" ? "C" : "F"}</span></div><div className="hero-condition"><WeatherGlyph code={current?.weather_code ?? 0} size={55}/><div><strong>{condition}</strong><span>Feels like {temp(current?.apparent_temperature, units)}</span></div></div></>}</div>
          <div className="hero-bottom"><div className="high-low"><span><ArrowUp size={14}/> {temp(daily?.temperature_2m_max?.[0], units)}</span><span><ArrowDown size={14}/> {temp(daily?.temperature_2m_min?.[0], units)}</span></div><div className="unit-controls"><button className={units === "c" ? "selected" : ""} onClick={() => setUnits("c")}>°C</button><span>/</span><button className={units === "f" ? "selected" : ""} onClick={() => setUnits("f")}>°F</button></div></div>
          <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
        </Card>
        <Card className="sun-card"><div className="section-label">DAYLIGHT</div><div className="sun-times"><div><span className="sun-icon sunrise"><Sunrise size={22}/></span><small>Sunrise</small><strong>{daily?.sunrise?.[0] ? localDate(daily.sunrise[0], forecast!.timezone, { hour: "numeric", minute: "2-digit" }) : "—"}</strong></div><div className="sun-arc"><div className="arc-line"/><Sun size={19}/></div><div><span className="sun-icon sunset"><Sunset size={22}/></span><small>Sunset</small><strong>{daily?.sunset?.[0] ? localDate(daily.sunset[0], forecast!.timezone, { hour: "numeric", minute: "2-digit" }) : "—"}</strong></div></div><div className="daylight-foot"><span>Local time</span><b>{forecast ? localDate(now.toISOString(), forecast.timezone, { hour: "numeric", minute: "2-digit" }) : "—"}</b></div></Card>
      </div>

      <div className="section-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>Weather conditions</h2></div><span className="section-note">Current observations</span></div>
      <div className="metrics-grid">
        <Metric icon={Droplets} label="Humidity" value={current ? `${num(current.relative_humidity_2m)}%` : "—"} detail="Relative humidity"/>
        <Metric icon={Wind} label="Wind" value={wind(current?.wind_speed_10m, windUnits)} detail={current?.wind_direction_10m != null ? `${Math.round(current.wind_direction_10m)}° direction` : "Direction unavailable"}/>
        <Metric icon={Gauge} label="Pressure" value={current ? `${num(current.surface_pressure)} hPa` : "—"} detail="Surface pressure"/>
        <Metric icon={Eye} label="Visibility" value={current?.visibility != null ? `${(current.visibility / 1000).toFixed(1)} km` : "—"} detail={current?.visibility == null ? "Not returned by source" : "Horizontal visibility"}/>
        <Metric icon={Sun} label="UV index" value={num(current?.uv_index, 1)} detail="Current UV level"/>
        <Metric icon={Thermometer} label="Dew point" value={current?.dew_point_2m != null ? temp(current.dew_point_2m, units) : "—"} detail="Moisture in the air"/>
        <Metric icon={Cloud} label="Cloud cover" value={current ? `${num(current.cloud_cover)}%` : "—"} detail="Sky coverage"/>
        <Metric icon={Umbrella} label="Precipitation" value={current ? `${num(current.precipitation, 1)} mm` : "—"} detail="Current precipitation"/>
      </div>
      <div className="wind-unit-row"><span>Wind speed units</span><div className="unit-controls compact"><button className={windUnits === "kmh" ? "selected" : ""} onClick={() => setWindUnits("kmh")}>km/h</button><span>/</span><button className={windUnits === "mph" ? "selected" : ""} onClick={() => setWindUnits("mph")}>mph</button></div></div>

      <div className="section-heading forecast-heading"><div><span className="eyebrow">THE NEXT 24 HOURS</span><h2>Hourly forecast</h2></div><span className="section-note">Local time · next 24 hours</span></div>
      <Card className="hourly-card"><div className="hourly-scroll">{loading ? <div className="loading-copy">Loading hourly forecast…</div> : hourRows.map((h, i) => <div className="hour-item" key={h.time}><span className="hour-time">{h.label}</span><WeatherGlyph code={h.code} size={25}/><b>{temp(h.temperature, units)}</b><span className="hour-rain"><Droplets size={11}/>{h.rain}%</span><small>{wind(h.wind, windUnits)}</small></div>)}</div></Card>

      <div className="charts-grid"><Card className="chart-card"><div className="card-heading"><div><span className="section-label">TEMPERATURE</span><h3>Coming up</h3></div><span className="chart-unit">°{units.toUpperCase()}</span></div>{loading ? <div className="chart-placeholder">Loading forecast data…</div> : <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartRows} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#80b8ff" stopOpacity={.28}/><stop offset="100%" stopColor="#80b8ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--grid)" vertical={false}/><XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} unit="°"/><Tooltip contentStyle={{ background: "var(--tooltip)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} formatter={(v) => [`${Number(v).toFixed(1)}°`, "Temperature"]}/><Area type="monotone" dataKey="displayTemp" stroke="#80b8ff" strokeWidth={2.5} fill="url(#tempFill)" activeDot={{ r: 4 }}/></AreaChart></ResponsiveContainer></div>}</Card>
      <Card className="chart-card"><div className="card-heading"><div><span className="section-label">PRECIPITATION CHANCE</span><h3>Rain outlook</h3></div><span className="chart-unit">%</span></div>{loading ? <div className="chart-placeholder">Loading forecast data…</div> : <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--grid)" vertical={false}/><XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} unit="%"/><Tooltip contentStyle={{ background: "var(--tooltip)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} formatter={(v) => [`${v}%`, "Rain probability"]}/><Bar dataKey="rain" fill="#65b9d8" radius={[5,5,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div>}</Card></div>

      <div className="section-heading"><div><span className="eyebrow">PLAN AHEAD</span><h2>7-day forecast</h2></div><span className="section-note">Daily outlook</span></div>
      <Card className="week-card">{loading ? <div className="loading-copy">Loading 7-day forecast…</div> : daily?.time.map((day, i) => <div className="week-row" key={day}><span className="week-day">{i === 0 ? "Today" : localDate(day, forecast!.timezone, { weekday: "short" })}</span><WeatherGlyph code={daily.weather_code[i]} size={23}/><span className="week-rain"><Droplets size={12}/>{daily.precipitation_probability_max[i] ?? 0}%</span><div className="week-range"><span>{temp(daily.temperature_2m_min[i], units)}</span><div className="range-track"><i style={{ left: `${Math.max(0, Math.min(100, ((daily.temperature_2m_min[i] - Math.min(...daily.temperature_2m_min)) / Math.max(1, Math.max(...daily.temperature_2m_max) - Math.min(...daily.temperature_2m_min))) * 100))}%`, width: `${Math.max(8, (daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / Math.max(1, Math.max(...daily.temperature_2m_max) - Math.min(...daily.temperature_2m_min)) * 100)}%` }}/></div><span>{temp(daily.temperature_2m_max[i], units)}</span></div></div>)}</Card>

      <div className="section-heading"><div><span className="eyebrow">BREATHE EASY</span><h2>Air quality</h2></div><span className="section-note">Open-Meteo air-quality model</span></div>
      <div className="air-grid"><Card className="aqi-card"><div className="aqi-head"><div><span className="section-label">US AQI</span><div className="aqi-number">{airLoading ? "—" : num(aqiValue)}</div><span className={cx("aqi-status", aqi.color)}>{airLoading ? "Loading…" : aqi.label}</span></div><div className="aqi-gauge"><Activity size={29}/></div></div><div className="aqi-meter"><i style={{ width: `${aqiValue == null ? 0 : Math.min(100, aqiValue)}%` }}/></div><p>{airLoading ? "Retrieving air-quality data…" : aqi.advice}</p>{airError && <small className="muted-note">{airError}</small>}</Card>
      <div className="pollutant-grid"><Metric icon={Activity} label="PM2.5" value={air?.current?.pm2_5 != null ? `${num(air.current.pm2_5, 1)} µg/m³` : "—"} detail="Fine particles"/><Metric icon={Activity} label="PM10" value={air?.current?.pm10 != null ? `${num(air.current.pm10, 1)} µg/m³` : "—"} detail="Coarse particles"/><Metric icon={Activity} label="Carbon monoxide" value={air?.current?.carbon_monoxide != null ? `${num(air.current.carbon_monoxide, 0)} µg/m³` : "—"} detail="CO concentration"/><Metric icon={Activity} label="Nitrogen dioxide" value={air?.current?.nitrogen_dioxide != null ? `${num(air.current.nitrogen_dioxide, 1)} µg/m³` : "—"} detail="NO₂ concentration"/><Metric icon={Activity} label="Ozone" value={air?.current?.ozone != null ? `${num(air.current.ozone, 1)} µg/m³` : "—"} detail="O₃ concentration"/></div></div>

      <div className="extras-grid"><Card className="saved-card"><div className="card-heading"><div><span className="section-label">YOUR PLACES</span><h3>Saved locations</h3></div><Heart size={17}/></div>{saved.length ? <div className="saved-list">{saved.map(p => <button key={`${p.latitude}-${p.longitude}`} onClick={() => choosePlace(p)} className={cx("saved-place", p.latitude === place.latitude && p.longitude === place.longitude && "current")}><MapPin size={15}/><span><b>{p.name}</b><small>{[p.admin1, p.country].filter(Boolean).join(", ")}</small></span>{p.latitude === place.latitude && p.longitude === place.longitude && <Check size={15}/>}</button>)}</div> : <p className="empty-copy">Save a city with the heart icon to build your own weather shortlist.</p>}</Card>
      <Card className="notice-card"><div className="notice-icon"><Globe2 size={20}/></div><div><span className="section-label">WEATHER SERVICES</span><h3>Clear data. No guesswork.</h3><p>Weather alerts are not provided by the configured Open-Meteo endpoints. No active alerts are inferred or fabricated.</p><p className="map-unavailable"><Compass size={14}/> Interactive precipitation map unavailable — no map tile provider is configured.</p></div></Card></div>
      <footer className="footer"><span>Weather data by <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo.com</a></span><span>{updatedAt ? `Updated ${localDate(updatedAt.toISOString(), forecast?.timezone ?? "Asia/Kolkata", { hour: "numeric", minute: "2-digit" })}` : "Waiting for live data"}</span></footer>
    </div>
  </main>;
}
