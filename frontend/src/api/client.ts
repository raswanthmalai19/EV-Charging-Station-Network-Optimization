import axios from 'axios'
import type {
  DefaultScenario,
  OptimizeRequest,
  OptimizeResult,
  Station,
  Summary,
  SweepResponse,
  TopCity,
  Zone,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 })

export async function getSummary(): Promise<Summary> {
  const { data } = await api.get('/api/stats/summary')
  return data
}

export async function getTopCities(limit = 15): Promise<TopCity[]> {
  const { data } = await api.get('/api/stats/top-cities', { params: { limit } })
  return data
}

export async function getStations(params: {
  city?: string
  network?: string
  search?: string
  min_dcfc?: number
  limit?: number
} = {}): Promise<{ count: number; stations: Station[] }> {
  const { data } = await api.get('/api/stations', { params })
  return data
}

export async function getCities(): Promise<{ city: string; station_count: number }[]> {
  const { data } = await api.get('/api/stations/cities')
  return data
}

export async function getNetworks(): Promise<{ network: string; station_count: number }[]> {
  const { data } = await api.get('/api/stations/networks')
  return data
}

export async function getZones(onlyGaps = false, limit = 1500): Promise<{ count: number; zones: Zone[] }> {
  const { data } = await api.get('/api/zones', { params: { only_gaps: onlyGaps, limit } })
  return data
}

export async function getGapZones(limit = 20): Promise<{ count: number; zones: Zone[] }> {
  const { data } = await api.get('/api/zones/gaps', { params: { limit } })
  return data
}

export async function getDefaultScenario(): Promise<DefaultScenario> {
  const { data } = await api.get('/api/optimize/default')
  return data
}

export async function runOptimize(req: OptimizeRequest): Promise<OptimizeResult> {
  const { data } = await api.post('/api/optimize', req)
  return data
}

export async function getSweep(radiusKm: number, budgets: number[]): Promise<SweepResponse> {
  const { data } = await api.get('/api/optimize/sweep', {
    params: { radius_km: radiusKm, budgets: budgets.join(',') },
  })
  return data
}
