import * as React from "react";
import { useState } from "react";
import FragranceCalculator from "../components/FragranceCalculator";
import RoomSprayCalculator from "../components/RoomSprayCalculator";
import { Calculator as CalculatorIcon, Flame, Wind, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<"candle" | "spray">("candle");
  const { user } = useAuth();
  const isPro = true; // Subscriptions removed

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <CalculatorIcon className="w-6 h-6" />
            Batch Calculators
          </h1>
          <p className="text-zinc-500 text-sm">Calculate exact weights for your candle and room spray batches.</p>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab("candle")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "candle" 
                ? "bg-white text-zinc-900 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Flame className="w-4 h-4" />
            Candles
          </button>
          <button
            onClick={() => setActiveTab("spray")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all relative",
              activeTab === "spray" 
                ? "bg-white text-zinc-900 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Wind className="w-4 h-4" />
            Room Sprays
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        {activeTab === "candle" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FragranceCalculator />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RoomSprayCalculator />
          </div>
        )}
      </div>
    </div>
  );
}
