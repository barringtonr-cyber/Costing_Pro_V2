import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Calculator, 
  Package, 
  FlaskConical, 
  Scale,
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";

export default function FragranceCalculator() {
  const [quantity, setQuantity] = useState<number>(1);
  const [containerSize, setContainerSize] = useState<number>(8);
  const [unit, setUnit] = useState<"ounce" | "gram">("ounce");
  const [fragranceLoad, setFragranceLoad] = useState<number>(10);
  const [waxGravity, setWaxGravity] = useState<number>(0.86);

  const [results, setResults] = useState({
    wax: 0,
    fragrance: 0,
    total: 0
  });

  const calculate = () => {
    const totalWeight = quantity * containerSize * waxGravity;
    const waxWeight = totalWeight / (1 + (fragranceLoad / 100));
    const fragranceWeight = totalWeight - waxWeight;

    setResults({
      wax: parseFloat(waxWeight.toFixed(2)),
      fragrance: parseFloat(fragranceWeight.toFixed(2)),
      total: parseFloat(totalWeight.toFixed(2))
    });
  };

  // Initial calculation
  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Fragrance Load Calculator</h2>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Container Size</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={containerSize}
                onChange={(e) => setContainerSize(parseFloat(e.target.value) || 0)}
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
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Wax Gravity</label>
            <input
              type="number"
              step="0.01"
              value={waxGravity}
              onChange={(e) => setWaxGravity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
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

        <div className="grid grid-cols-3 gap-2 flex-1">
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Package className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Wax</p>
            <p className="text-lg font-black text-zinc-900 leading-none">{results.wax}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{unit}</p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <FlaskConical className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Fragrance</p>
            <p className="text-lg font-black text-zinc-900 leading-none">{results.fragrance}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{unit}</p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Scale className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total</p>
            <p className="text-lg font-black text-zinc-900 leading-none">{results.total}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{unit}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
