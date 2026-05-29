import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Calculator, 
  Droplets, 
  FlaskConical, 
  Scale,
  RefreshCw,
  Wind
} from "lucide-react";
import { cn } from "../lib/utils";

export default function RoomSprayCalculator() {
  const [quantity, setQuantity] = useState<number>(1);
  const [bottleSize, setBottleSize] = useState<number>(4);
  const [unit, setUnit] = useState<"ounce" | "gram">("ounce");
  const [fragranceLoad, setFragranceLoad] = useState<number>(5);
  const [formula, setFormula] = useState<"ecoBase" | "dulceria">("ecoBase");

  const [results, setResults] = useState({
    base: 0,
    water: 0,
    fragrance: 0,
    total: 0
  });

  const calculate = () => {
    const totalWeight = quantity * bottleSize;
    const fragranceWeight = totalWeight * (fragranceLoad / 100);
    const remainingWeight = totalWeight - fragranceWeight;
    
    if (formula === "ecoBase") {
      // 3 parts water to 1 part base (total 4 parts)
      const bWeight = remainingWeight / 4;
      const wWeight = bWeight * 3;
      setResults({
        base: parseFloat(bWeight.toFixed(2)),
        water: parseFloat(wWeight.toFixed(2)),
        fragrance: parseFloat(fragranceWeight.toFixed(2)),
        total: parseFloat(totalWeight.toFixed(2))
      });
    } else {
      // Dulceria base (no additional additives)
      setResults({
        base: parseFloat(remainingWeight.toFixed(2)),
        water: 0,
        fragrance: parseFloat(fragranceWeight.toFixed(2)),
        total: parseFloat(totalWeight.toFixed(2))
      });
    }
  };

  // Initial calculation
  useEffect(() => {
    calculate();
  }, [formula, quantity, bottleSize, fragranceLoad, unit]);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Room & Linen Spray Calculator</h2>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Base Formula</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormula("ecoBase")}
              className={cn(
                "px-3 py-2 text-xs font-bold rounded-lg border transition-all",
                formula === "ecoBase"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              EcoBase (Water Diluted)
            </button>
            <button
              onClick={() => setFormula("dulceria")}
              className={cn(
                "px-3 py-2 text-xs font-bold rounded-lg border transition-all",
                formula === "dulceria"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              Dulceria (Fragrance Only)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Number of Bottles</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bottle Size</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={bottleSize}
                onChange={(e) => setBottleSize(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="px-2 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none bg-white"
              >
                <option value="ounce">oz</option>
                <option value="gram">g</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fragrance Load (%)</label>
            <input
              type="number"
              value={fragranceLoad}
              onChange={(e) => setFragranceLoad(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
        >
          <RefreshCw className="w-4 h-4" />
          Calculate
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Results</span>
          </div>
        </div>

        <div className={cn(
          "grid gap-2 flex-1",
          formula === "ecoBase" ? "grid-cols-2" : "grid-cols-3"
        )}>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Droplets className="w-4 h-4 text-indigo-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">
              {formula === "ecoBase" ? "Base (1 part)" : "Room Spray Base"}
            </p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.base} oz` : `${results.base} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.base * 28.3495).toFixed(2)} g)` : `(${(results.base * 0.035274).toFixed(2)} oz)`}
            </p>
          </div>
          {formula === "ecoBase" && (
            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
              <Droplets className="w-4 h-4 text-blue-400 mb-2" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Water (3 parts)</p>
              <p className="text-lg font-black text-zinc-900 leading-none">
                {unit === "ounce" ? `${results.water} oz` : `${results.water} g`}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">
                {unit === "ounce" ? `(${(results.water * 28.3495).toFixed(2)} g)` : `(${(results.water * 0.035274).toFixed(2)} oz)`}
              </p>
            </div>
          )}
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <FlaskConical className="w-4 h-4 text-teal-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Fragrance</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.fragrance} oz` : `${results.fragrance} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.fragrance * 28.3495).toFixed(2)} g)` : `(${(results.fragrance * 0.035274).toFixed(2)} oz)`}
            </p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Scale className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total Weight</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.total} oz` : `${results.total} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.total * 28.3495).toFixed(2)} g)` : `(${(results.total * 0.035274).toFixed(2)} oz)`}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100">
          <p className="text-sm text-zinc-500 text-center italic font-medium">
            {formula === "ecoBase" 
              ? "* This calculator is based on the CandleScience EcoBase Room and Linen Spray formula (1 part base to 3 parts water)."
              : "* This calculator is optimized for Dulceria Room Spray base which requires only base and fragrance load."}
          </p>
        </div>
      </div>
    </div>
  );
}
