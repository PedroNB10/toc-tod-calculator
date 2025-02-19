import airportsData from "../../waypoints.json"

import { BrazilianAirport } from "../data/brazilian-airports";

interface AirportData {
  elevation: {
    feet: number;
    meters: number;
  };
  name: string;
  city?: string;
  state?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export function getAirportData(icao: string): AirportData | null {
  const airportsDataJson = airportsData as BrazilianAirport[];
  const airport = airportsDataJson.find(
    airport => airport.icao.toUpperCase() === icao.toUpperCase()
  );

  if (!airport) return null;

  return {
    elevation: {
      feet: airport.elevation,
      meters: Math.round(airport.elevation * 0.3048)
    },
    name: airport.name,
    city: airport.city,
    state: airport.state,
    coordinates: {
      lat: airport.lat,
      lon: airport.lon
    }
  };
}