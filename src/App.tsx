import React, { useEffect, useState } from "react";
import {
  Plane,
  ArrowUp,
  ArrowDown,
  Navigation,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { getAirportData } from "./services/airport";

type SpeedUnit = "kt" | "mph" | "kmh";
type RateUnit = "ftmin" | "ms";

interface Airport {
  icao: string;
  elevation: number;
  name?: string;
  city?: string;
  state?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

interface CalculationResult {
  tocDistance: number;
  todDistance: number;
  totalDistance: number;
  climbTime: number;
  cruiseTime: number;
  descentTime: number;
  totalTime: number;
}

const convertSpeed = (
  value: number,
  from: SpeedUnit,
  to: SpeedUnit
): number => {
  const toKnots: Record<SpeedUnit, number> = {
    kt: 1,
    mph: 0.868976,
    kmh: 0.539957,
  };
  const fromKnots: Record<SpeedUnit, number> = {
    kt: 1,
    mph: 1.15078,
    kmh: 1.852,
  };
  const result = value * toKnots[from] * fromKnots[to];
  return isFinite(result) ? result : 0;
};
const convertRate = (value: number, from: RateUnit, to: RateUnit): number => {
  if (from === to) return value;
  let result;
  if (from === "ftmin" && to === "ms") {
    result = value * 0.00508;
  } else {
    result = value * 196.85;
  }
  return isFinite(result) ? result : 0;
};

function App() {
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("kt");
  const [rateUnit, setRateUnit] = useState<RateUnit>("ftmin");
  const [error, setError] = useState<{ departure?: string; arrival?: string }>(
    {}
  );

  const [inputs, setInputs] = useState({
    cruiseAltitude: null, // feet
    climbSpeed: null, // in selected speed unit
    cruiseSpeed: null, // in selected speed unit
    descentSpeed: null, // in selected speed unit
    climbRate: null, // in selected rate unit
    descentRate: null, // in selected rate unit
    departureIcao: "",
    arrivalIcao: "",
  });

  const [airports, setAirports] = useState<{
    departure?: Airport;
    arrival?: Airport;
  }>({});

  const calculateResults = (): CalculationResult => {
    // Convert all speeds to knots for calculations
    const climbSpeedKt = convertSpeed(inputs.climbSpeed ?? 0, speedUnit, "kt");
    const cruiseSpeedKt = convertSpeed(
      inputs.cruiseSpeed ?? 0,
      speedUnit,
      "kt"
    );
    const descentSpeedKt = convertSpeed(
      inputs.descentSpeed ?? 0,
      speedUnit,
      "kt"
    );

    // Convert rates to ft/min for calculations
    const climbRateFtMin = convertRate(
      inputs.climbRate ?? 0,
      rateUnit,
      "ftmin"
    );
    const descentRateFtMin = convertRate(
      inputs.descentRate ?? 0,
      rateUnit,
      "ftmin"
    );

    // Calculate climb phase
    const climbHeight =
      (inputs.cruiseAltitude ?? 0) - (airports.departure?.elevation || 0);
    const climbTimeHours = climbHeight / (climbRateFtMin * 60);
    const tocDistance = climbSpeedKt * climbTimeHours;

    // Calculate descent phase
    const descentHeight =
      (inputs.cruiseAltitude ?? 0) - (airports.arrival?.elevation || 0);
    const descentTimeHours = descentHeight / (descentRateFtMin * 60);
    const todDistance = descentSpeedKt * descentTimeHours;

    // Calculate total distance using coordinates if available
    let totalDistance = tocDistance + todDistance + 100; // Default with padding

    if (airports.departure?.coordinates && airports.arrival?.coordinates) {
      const R = 3440.065; // Earth's radius in nautical miles
      const lat1 = (airports.departure.coordinates.lat * Math.PI) / 180;
      const lon1 = (airports.departure.coordinates.lon * Math.PI) / 180;
      const lat2 = (airports.arrival.coordinates.lat * Math.PI) / 180;
      const lon2 = (airports.arrival.coordinates.lon * Math.PI) / 180;

      // Haversine formula
      const dlon = lon2 - lon1;
      const dlat = lat2 - lat1;
      const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
      const c = 2 * Math.asin(Math.sqrt(a));

      // Calculate great circle distance
      totalDistance = R * c;
    }

    // Calculate cruise time
    const cruiseDistance = totalDistance - (tocDistance + todDistance);
    const cruiseTimeHours = cruiseDistance / cruiseSpeedKt;

    return {
      tocDistance: Math.round(tocDistance * 10) / 10,
      todDistance: Math.round(todDistance * 10) / 10,
      totalDistance: Math.round(totalDistance * 10) / 10,
      climbTime: Math.round(climbTimeHours * 60), // Convert to minutos
      cruiseTime: Math.round(cruiseTimeHours * 60), // Convert to minutos
      descentTime: Math.round(descentTimeHours * 60), // Convert to minutos
      totalTime: Math.round(
        (climbTimeHours + cruiseTimeHours + descentTimeHours) * 60
      ), // Total minutos
    };
  };

  const results = calculateResults();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: Number(value) || value, // Allow string values for ICAO codes
    }));
  };

  const handleAirportSearch = (icao: string, type: "departure" | "arrival") => {
    if (!icao) {
      setError((prev) => ({
        ...prev,
        [type]: "Por favor, insira um código ICAO",
      }));
      return;
    }

    setError((prev) => ({ ...prev, [type]: undefined }));

    const airportData = getAirportData(icao.toUpperCase());

    if (!airportData) {
      setError((prev) => ({
        ...prev,
        [type]: "Aeroporto não encontrado.",
      }));
      return;
    }

    const airport: Airport = {
      icao: icao.toUpperCase(),
      elevation: airportData.elevation.feet,
      name: airportData.name,
      city: airportData.city,
      state: airportData.state,
      coordinates: airportData.coordinates,
    };

    setAirports((prev) => ({ ...prev, [type]: airport }));
  };

  useEffect(() => {
    if (inputs.departureIcao === "" || inputs.arrivalIcao === "") {
      setAirports({});
      return;
    }
  }, [inputs.arrivalIcao, inputs.departureIcao]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8">
          <Plane className="w-8 h-8 text-emerald-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">
            Calculadora TOC/TOD
          </h1>
        </div>

        {/* Unit Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Preferências de Unidade
          </h2>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Unidade de Velocidade
              </label>
              <select
                value={speedUnit}
                onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="kt">Knots</option>
                <option value="mph">MPH</option>
                <option value="kmh">km/h</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Unidade de Taxa
              </label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as RateUnit)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ftmin">ft/min</option>
                <option value="ms">m/s</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Parâmetros de Voo
            </h2>
            <div className="space-y-4">
              {/* Airport Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    ICAO de Partida
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        name="departureIcao"
                        value={inputs.departureIcao}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                        maxLength={4}
                      />
                      {error.departure && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {error.departure}
                        </p>
                      )}
                      {airports.departure && (
                        <div className="mt-1 text-sm text-green-600">
                          <p>{airports.departure.name}</p>
                          <p className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {airports.departure.city},{" "}
                            {airports.departure.state}
                          </p>
                          <p className="text-gray-600">
                            Elevação: {airports.departure.elevation} ft
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleAirportSearch(inputs.departureIcao, "departure")
                      }
                      className="h-10 px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    ICAO de Chegada
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        name="arrivalIcao"
                        value={inputs.arrivalIcao}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                        maxLength={4}
                      />
                      {error.arrival && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {error.arrival}
                        </p>
                      )}
                      {airports.arrival && (
                        <div className="mt-1 text-sm text-green-600">
                          <p>{airports.arrival.name}</p>
                          <p className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {airports.arrival.city}, {airports.arrival.state}
                          </p>
                          <p className="text-gray-600">
                            Elevação: {airports.arrival.elevation} ft
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleAirportSearch(inputs.arrivalIcao, "arrival")
                      }
                      className="h-10 px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Altitude de Cruzeiro (pés)
                </label>
                <input
                  type="number"
                  name="cruiseAltitude"
                  value={inputs.cruiseAltitude ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Velocidade de Subida ({speedUnit})
                </label>
                <input
                  type="number"
                  name="climbSpeed"
                  value={inputs.climbSpeed ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Velocidade de Cruzeiro ({speedUnit})
                </label>
                <input
                  type="number"
                  name="cruiseSpeed"
                  value={inputs.cruiseSpeed ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Velocidade de Descida ({speedUnit})
                </label>
                <input
                  type="number"
                  name="descentSpeed"
                  value={inputs.descentSpeed ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Taxa de Subida ({rateUnit})
                </label>
                <input
                  type="number"
                  name="climbRate"
                  value={inputs.climbRate ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Taxa de Descida ({rateUnit})
                </label>
                <input
                  type="number"
                  name="descentRate"
                  value={inputs.descentRate ?? ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">
              Perfil de Voo
            </h2>

            <div className="space-y-6">
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <ArrowUp className="w-5 h-5 text-emerald-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">
                    Fase de Subida
                  </h3>
                </div>
                <p className="text-gray-600">
                  Distância para TOC:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.tocDistance) ||
                    !isFinite(results.tocDistance)
                      ? 0
                      : results.tocDistance}{" "}
                    NM
                  </span>
                </p>
                <p className="text-gray-600">
                  Tempo de subida:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.climbTime) || !isFinite(results.climbTime)
                      ? 0
                      : results.climbTime}{" "}
                    minutos
                  </span>
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Plane className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">
                    Fase de Cruzeiro
                  </h3>
                </div>
                <p className="text-gray-600">
                  Tempo de Cruzeiro:{" "}
                  <span className="font-semibold text-green-600">
                    {isNaN(results.cruiseTime) || !isFinite(results.cruiseTime)
                      ? 0
                      : results.cruiseTime}{" "}
                    minutos
                  </span>
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <ArrowDown className="w-5 h-5 text-emerald-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">
                    Fase de Descida
                  </h3>
                </div>
                <p className="text-gray-600">
                  Distância do TOD:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.todDistance) ||
                    !isFinite(results.todDistance)
                      ? 0
                      : results.todDistance}{" "}
                    NM
                  </span>
                </p>
                <p className="text-gray-600">
                  Tempo de Descida:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.descentTime) ||
                    !isFinite(results.descentTime)
                      ? 0
                      : results.descentTime}{" "}
                    minutos
                  </span>
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Navigation className="w-5 h-5 text-emerald-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">
                    Voo Total
                  </h3>
                </div>
                <p className="text-gray-600">
                  Distância Total:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.totalDistance) ||
                    !isFinite(results.totalDistance)
                      ? 0
                      : results.totalDistance}{" "}
                    NM
                  </span>
                </p>
                <p className="text-gray-600">
                  Tempo total:{" "}
                  <span className="font-semibold text-emerald-600">
                    {isNaN(results.totalTime) ? 0 : results.totalTime} minutos
                  </span>
                </p>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Nota:
                </h3>
                <p className="text-sm text-gray-600">
                  Os cálculos realizados pela plataforma são aproximados. Use
                  apenas para fins de planejamento e treinamento. Sempre siga os
                  procedimentos recomendados e o perfil de voo do fabricante da
                  aeronave.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
