export interface Station {
  id: number
  station_name: string
  street_address: string
  city: string
  state: string
  zip: string
  latitude: number
  longitude: number
  ev_network: string
  access_code: string
  status_code: string
  ev_level1_evse_num: number
  ev_level2_evse_num: number
  ev_dc_fast_count: number
  ev_connector_types: string | null
  open_date: string | null
  facility_type: string | null
}

export interface Zone {
  zcta: string
  latitude: number
  longitude: number
  population: number
  existing_stations: number
  existing_level1: number
  existing_level2: number
  existing_dcfc: number
  dist_to_nearest_station_km: number
  covered_by_existing: boolean
}

export interface RadiusSweepPoint {
  radius_km: number
  zones_covered: number
  pct_zones_covered: number
  population_covered: number
  pct_population_covered: number
}

export interface Summary {
  state: string
  total_population: number
  total_zones: number
  zones_with_stations: number
  zero_station_gap_zones: number
  gap_zone_population: number
  total_stations: number
  total_level1_ports: number
  total_level2_ports: number
  total_dcfc_ports: number
  default_radius_km: number
  default_budget: number
  baseline_coverage_pct: number
  baseline_covered_population: number
  radius_sweep: RadiusSweepPoint[]
  live: {
    total_stations_loaded: number
    total_zones_loaded: number
    networks_count: number
    cities_count: number
  }
}

export interface TopCity {
  city: string
  stations: number
  level2_ports: number
  dcfc_ports: number
}

export interface ChargerAllocation {
  site_index: number
  zcta: string
  population: number
  was_zero_station_gap_zone: boolean
  l2_chargers: number
  dcfc_chargers: number
  total_capacity_kw: number
  site_cost_usd: number
}

export interface SelectedSite {
  zcta: string
  latitude: number
  longitude: number
  population: number
  existing_stations: number
  dist_to_nearest_station_km: number | null
}

export interface OptimizeResult {
  method: 'milp' | 'greedy'
  status: string
  solve_time_sec: number
  radius_km: number
  budget: number
  baseline_population: number
  baseline_coverage_pct: number
  covered_population: number
  total_population: number
  coverage_pct: number
  newly_covered_population: number
  selected_sites: SelectedSite[]
  charger_allocation: ChargerAllocation[] | null
  total_cost_usd: number | null
  total_capacity_kw: number | null
}

export interface OptimizeRequest {
  budget: number
  radius_km: number
  method: 'greedy' | 'milp'
  allocate_chargers?: boolean
}

export interface DefaultScenarioSide {
  method: string
  status: string
  solve_time_sec: number
  radius_km: number
  budget: number
  baseline_population: number
  covered_population: number
  total_population: number
  coverage_pct: number
  selected_sites: (SelectedSite & { newly_covered: boolean })[]
}

export interface DefaultScenario {
  milp: DefaultScenarioSide
  greedy: DefaultScenarioSide
  charger_allocation: ChargerAllocation[]
  sensitivity_budget_sweep: { budget: number; covered_population: number; coverage_pct: number; selected_sites: number }[]
  greedy_vs_exact_sweep: {
    radius_km: number
    radius_label: string
    budget: number
    milp_covered_pop: number
    milp_time_sec: number
    greedy_covered_pop: number
    greedy_time_sec: number
    gap_people: number
  }[]
}

export interface SweepResponse {
  radius_km: number
  baseline_population: number
  baseline_coverage_pct: number
  total_population: number
  sweep: { budget: number; covered_population: number; coverage_pct: number }[]
}
