export interface BrazilianAirport {
  icao: string;
  name: string;
  city: string; 
  iata: string;
  state: string;
  elevation: number;
  lat: number;
  lon: number;
}



export const brazilianAirports: BrazilianAirport[] = [
  {
    icao: "SBGR",
    iata: "GRU",
    name: "Aeroporto Internacional de São Paulo/Guarulhos",
    city: "Guarulhos",
    state: "SP",
    elevation: 2459,
    lat: -23.435556,
    lon: -46.473056
  },
  {
    icao: "SBBR",
    iata: "BSB",
    name: "Aeroporto Internacional Presidente Juscelino Kubitschek",
    city: "Brasília",
    state: "DF",
    elevation: 3497,
    lat: -15.869167,
    lon: -47.920833
  },
  {
    icao: "SBGL",
    iata: "GIG",
    name: "Aeroporto Internacional do Rio de Janeiro/Galeão",
    city: "Rio de Janeiro",
    state: "RJ",
    elevation: 28,
    lat: -22.808889,
    lon: -43.243611
  },
  // Add more airports as needed
];