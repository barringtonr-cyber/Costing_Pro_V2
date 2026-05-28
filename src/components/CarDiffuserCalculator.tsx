import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Calculator, 
  Droplets, 
  FlaskConical, 
  Scale,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { cn } from "../lib/utils";

export default function CarDiffuserCalculator() {
  const [unit, setUnit] = useState<"oz" | "g" | "ml">("oz");
  const [sizePerUnit, setSizePerUnit] = useState<number>(4);
  const [quantity, setQuantity] = useState<number>(1);
  const [fragranceLoad, setFragranceLoad] = useState<number>(23);

  const [results, setResults] = useState({
    base: 3.08,
    fragrance: 0.92,
    total: 4.00
  });

  const calculate = () => {
    const totalWeight = sizePerUnit * quantity;
    const fragranceWeight = totalWeight * (fragranceLoad / 100);
    const baseWeight = totalWeight - fragranceWeight;

    setResults({
      base: parseFloat(baseWeight.toFixed(2)),
      fragrance: parseFloat(fragranceWeight.toFixed(2)),
      total: parseFloat(totalWeight.toFixed(2))
    });
  };

  // Auto-calculate on state change
  useEffect(() => {
    calculate();
  }, [unit, sizePerUnit, quantity, fragranceLoad]);

  return (
    <div className="space-y-6">
      {/* Batch Settings Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Batch Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Product Type Dropdown (Locked / Selection) */}
          <div className="md:col-span-7 space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Product type</label>
            <select
              value="Car diffuser"
              disabled
              className="w-full bg-zinc-50 border border-zinc-200/85 rounded-xl px-4 py-3 text-sm focus:outline-none text-zinc-800 font-medium cursor-not-allowed opacity-90"
            >
              <option value="Car diffuser">Car diffuser</option>
            </select>
          </div>

          {/* Unit Dropdown */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "oz" | "g" | "ml")}
              className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200/85 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-zinc-800 font-medium"
            >
              <option value="oz">Ounces (oz)</option>
              <option value="g">Grams (g)</option>
              <option value="ml">Milliliters (ml)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Size per Unit Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Size per unit</label>
            <input
              type="number"
              step="0.01"
              value={sizePerUnit}
              onChange={(e) => setSizePerUnit(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200/85 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-zinc-800 font-medium font-mono"
            />
          </div>

          {/* Number of Units Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Number of units</label>
            <input
              type="number"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200/85 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-zinc-800 font-medium font-mono"
            />
          </div>

          {/* Fragrance Load Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Fragrance load (%)</label>
            <input
              type="number"
              step="0.1"
              value={fragranceLoad}
              onChange={(e) => setFragranceLoad(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200/85 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-zinc-800 font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* Results Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Results — {quantity} {quantity === 1 ? "Unit" : "Units"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Base */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col justify-between h-36">
            <div>
              <p className="text-xs font-medium text-zinc-500">Total base</p>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-serif text-zinc-900 tracking-tight">
                {results.base.toFixed(2)}
              </span>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">{unit}</p>
            </div>
          </div>

          {/* Total Fragrance */}
          <div className="bg-amber-50/50 border border-amber-100/40 rounded-2xl p-5 flex flex-col justify-between h-36">
            <div>
              <p className="text-xs font-medium text-amber-800/80">Total fragrance</p>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-serif text-amber-950 tracking-tight">
                {results.fragrance.toFixed(2)}
              </span>
              <p className="text-[11px] text-amber-600/70 font-mono mt-1">{unit}</p>
            </div>
          </div>

          {/* Combined Total */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col justify-between h-36">
            <div>
              <p className="text-xs font-medium text-zinc-500">Combined total</p>
            </div>
            <div className="mt-2 text-left">
              <span className="text-4xl font-serif text-zinc-900 tracking-tight">
                {results.total.toFixed(2)}
              </span>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">{unit}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
