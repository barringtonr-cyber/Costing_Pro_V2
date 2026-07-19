import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Calculator, 
  Package, 
  FlaskConical, 
  Scale,
  RefreshCw,
  Info
} from "lucide-react";
import { cn } from "../lib/utils";

export default function FragranceCalculator() {
  const [quantity, setQuantity] = useState<number>(1);
  const [containerSize, setContainerSize] = useState<number>(8);
  const [unit, setUnit] = useState<"ounce" | "gram">("ounce");
  const [fragranceLoad, setFragranceLoad] = useState<number>(10);
  const [waxGravity, setWaxGravity] = useState<number>(0.86);
  const [calcMode, setCalcMode] = useState<"volume" | "weight">("volume");

  const [results, setResults] = useState({
    wax: 0,
    fragrance: 0,
    total: 0
  });

  const calculate = () => {
    const effectiveGravity = calcMode === "weight" ? 1 : waxGravity;
    const totalWeight = quantity * containerSize * effectiveGravity;
    const waxWeight = totalWeight / (1 + (fragranceLoad / 100));
    const fragranceWeight = totalWeight - waxWeight;

    setResults({
      wax: parseFloat(waxWeight.toFixed(2)),
      fragrance: parseFloat(fragranceWeight.toFixed(2)),
      total: parseFloat(totalWeight.toFixed(2))
    });
  };

  // Auto-calculate on input change
  useEffect(() => {
    calculate();
  }, [quantity, containerSize, unit, fragranceLoad, waxGravity, calcMode]);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Fragrance Load Calculator</h2>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {/* Calculation Mode */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Calculation Mode</label>
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setCalcMode("volume")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                calcMode === "volume"
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Fluid Volume (fl oz / ml)
            </button>
            <button
              type="button"
              onClick={() => setCalcMode("weight")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                calcMode === "weight"
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Target Pour Weight (oz / g)
            </button>
          </div>
        </div>

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
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {calcMode === "volume" ? "Container Vol" : "Target Pour Weight"}
            </label>
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
              value={calcMode === "weight" ? 1.00 : waxGravity}
              disabled={calcMode === "weight"}
              onChange={(e) => setWaxGravity(parseFloat(e.target.value) || 0)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none",
                calcMode === "weight" 
                  ? "bg-zinc-50 border-zinc-100 text-zinc-400 cursor-not-allowed" 
                  : "bg-white border-zinc-200 text-zinc-900"
              )}
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

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Package className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Wax</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.wax} oz` : `${results.wax} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.wax * 28.3495).toFixed(2)} g)` : `(${(results.wax / 28.3495).toFixed(2)} oz)`}
            </p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <FlaskConical className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Fragrance</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.fragrance} oz` : `${results.fragrance} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.fragrance * 28.3495).toFixed(2)} g)` : `(${(results.fragrance / 28.3495).toFixed(2)} oz)`}
            </p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center text-center">
            <Scale className="w-4 h-4 text-zinc-400 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {unit === "ounce" ? `${results.total} oz` : `${results.total} g`}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {unit === "ounce" ? `(${(results.total * 28.3495).toFixed(2)} g)` : `(${(results.total / 28.3495).toFixed(2)} oz)`}
            </p>
          </div>
        </div>

        {/* Educational Warning / Help Card */}
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-4 space-y-2 text-xs text-amber-900 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>💡 Why did my batch make more candles than expected?</span>
          </div>
          <div className="space-y-1.5 text-zinc-600 leading-relaxed pl-5">
            <p>
              A common candle making pitfall is using the <strong className="text-zinc-800">nominal jar size</strong> (e.g. "8 oz jar") as your container size. Candle jars are sold by volume (fluid ounces), but wax is measured by <strong className="text-zinc-800">weight</strong>.
            </p>
            <p>
              Because wax is lighter than water (approx. 0.86 gravity) and jars are never filled to the brim, a standard nominal "8 oz" jar usually holds only about <strong className="text-zinc-800">5.5 oz to 6 oz</strong> of actual wax mixture by weight.
            </p>
            <p>
              If you melted <span className="font-mono text-zinc-800">37.53 oz</span> of wax, that is enough to make <strong>6 full 8 fl oz containers</strong> (which would hold ~6.88 oz weight each). But if you pour that into jars filled to a typical <span className="font-mono text-zinc-800">4.5 oz</span> weight, you will end up filling <strong>9 candles instead of 6!</strong>
            </p>
            <p className="text-[11px] font-semibold text-amber-800 mt-1">
              👉 Fix: Weigh your empty jar, fill it with water to your desired fill level, multiply that water weight by 0.86 to find your exact <strong className="text-zinc-800">actual pour weight</strong>, enter that as the Container Size, and choose <strong className="text-zinc-800">Target Pour Weight</strong> mode above!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
