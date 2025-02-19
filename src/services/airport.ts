import airportsData from "../../waypoints.json";
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

// Create a lookup map keyed by uppercase ICAO code
const airportMap: Record<string, BrazilianAirport> = {};
const airportsDataJson = airportsData as BrazilianAirport[];

airportsDataJson.forEach((airport) => {
  airportMap[airport.icao.toUpperCase()] = airport;
});

export function getAirportData(icao: string): AirportData | null {
  const airport = airportMap[icao.toUpperCase()];
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
