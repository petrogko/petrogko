import { fetchJson } from './http.js';

export class MissingKeyError extends Error {
  constructor() {
    super('OPEN_WEATHER_MAP_KEY is not set');
    this.name = 'MissingKeyError';
  }
}

export async function fetchWeather({ fetch: fetchImpl = globalThis.fetch, apiKey, lat, lon }) {
  if (!apiKey) throw new MissingKeyError();
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(apiKey)}`;
  const r = await fetchJson(fetchImpl, url);
  const w = r?.weather?.[0];
  if (typeof r?.main?.temp !== 'number' || !w) throw new Error('Unexpected OpenWeather response shape');
  return {
    temp: r.main.temp,
    feelsLike: typeof r.main.feels_like === 'number' ? r.main.feels_like : r.main.temp,
    conditionId: w.id,
    description: w.description ?? '',
  };
}
