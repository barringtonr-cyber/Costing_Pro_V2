import React, { useState, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { api } from "../api";
import { 
  Sparkles, 
  X, 
  Loader2, 
  Save, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  Beaker,
  Scale,
  Droplets,
  DollarSign
} from "lucide-react";
import { cn } from "../lib/utils";

interface Material {
  id: string;
  name: string;
  type: string;
  costPerUnit: number;
  quantityInStock: number;
  unit: string;
  piecesPerBag?: number;
}

interface AIRecipeGeneratorProps {
  onClose: () => void;
  onSave: () => void;
}

export default function AIRecipeGenerator({ onClose, onSave }: AIRecipeGeneratorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [productType, setProductType] = useState<"Candle" | "Room Spray" | "Auto">("Auto");

  const getMaterialBaseUnitSize = (material: Material) => {
    if (!material) return 1;
    const unit = material.unit.toLowerCase();
    
    // Handle "5 lbs", "10 lbs" etc
    if (unit.includes("lb")) {
      const match = unit.match(/(\d+(\.\d+)?)/);
      return (match ? parseFloat(match[0]) : 1) * 16;
    }
    
    // Handle "Piece Bag" or units containing "piece"
    if (unit.includes("piece") || unit.includes("bag")) {
      return material.piecesPerBag || 1;
    }

    // Handle "oz" suffix
    if (unit.includes("oz")) {
      const match = unit.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : 1;
    }

    // Default to numeric value or 1
    const num = parseFloat(unit);
    return isNaN(num) ? 1 : num;
  };

  const fetchMaterials = async () => {
    try {
      const data = await api.getMaterials();
      setMaterials(data as any);
    } catch (err) {
      console.error(err);
      setError("Failed to load materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const generateRecipe = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fragrances = materials.filter(m => m.type === "Fragrance");
      const waxes = materials.filter(m => m.type === "Wax");
      const vessels = materials.filter(m => m.type === "Vessels");
      const wicks = materials.filter(m => m.type === "Wicks");
      const sprayBases = materials.filter(m => m.type === "Spray Base");

      const prompt = `
        You are an expert candle and room spray maker. Create a unique recipe using the materials available in my inventory.
        
        ${productType !== "Auto" ? `I specifically want to create a ${productType}.` : ""}
        ${userPrompt ? `User Request: "${userPrompt}"` : "Create a creative and popular scent blend."}

        Available Fragrances:
        ${fragrances.map(f => `- ${f.name} (Unit: ${f.unit})`).join("\n")}
        
        Available Waxes:
        ${waxes.length > 0 ? waxes.map(w => `- ${w.name} (Unit: ${w.unit})`).join("\n") : "NONE AVAILABLE"}
        
        Available Wicks:
        ${wicks.length > 0 ? wicks.map(w => `- ${w.name} (Unit: ${w.unit}, Pieces/Bag: ${w.piecesPerBag})`).join("\n") : "NONE AVAILABLE"}
        
        Available Vessels:
        ${vessels.length > 0 ? vessels.map(v => `- ${v.name} (Unit: ${v.unit})`).join("\n") : "NONE AVAILABLE"}

        Available Spray Bases:
        ${sprayBases.length > 0 ? sprayBases.map(s => `- ${s.name} (Unit: ${s.unit})`).join("\n") : "NONE AVAILABLE"}

        Recipe Formulas & Constraints:
        1. FOR CANDLES:
           - A typical candle uses 7-10oz of wax and 0.5-1oz of fragrance.
           - Always include 1 Vessel and 1 Wick (from available lists).
        
        2. FOR ROOM SPRAYS:
           - Use one of these two industry-standard formulas:
             a) "EcoBase Formula": 1 part Spray Base to 3 parts Distilled Water. (Add "Distilled Water" to materials list even if not in inventory, cost is 0).
             b) "Dulceria Formula": 100% Spray Base + Fragrance (no water). Used for bases sold by Dulceria Candle Supply.
           - Total weight should be 2-4oz. Fragrance load should be 5-10% of total weight.
        
        General Rules:
        - Use AT MOST 3 different fragrances.
        - Specify the quantity of each material in OUNCES (oz) for wax, spray base, water, and fragrance, and PIECES (pcs) for wicks and vessels.
        - If you use more than one fragrance, specify the percentage of each fragrance in the total fragrance blend.
        - ONLY use materials from the lists above (except for "Distilled Water" in EcoBase sprays). Use the EXACT names provided.
        
        Return a JSON object with:
        - name: A creative name for the product
        - description: A short poetic description
        - type: Either "Candle" or "Room Spray"
        - formula: (For Room Sprays only) Either "EcoBase" or "Dulceria"
        - materials: An array of objects with:
          - name: The EXACT name of the material from the lists provided (or "Distilled Water")
          - quantityUsed: The amount to use (number only, in oz or pcs)
          - percentage: (Optional) For fragrances in a blend, the percentage of this fragrance relative to the total fragrance weight.
      `;

      const responseConfig = {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["Candle", "Room Spray"] },
              formula: { type: Type.STRING },
              materials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantityUsed: { type: Type.NUMBER },
                    percentage: { type: Type.NUMBER }
                  },
                  required: ["name", "quantityUsed"]
                }
              }
            },
            required: ["name", "description", "materials", "type"]
          }
        }
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        ...responseConfig
      });

      const recipe = JSON.parse(response.text);
      
      // Enrich with cost data and material IDs from our materials list
      recipe.materials = recipe.materials
        .map((rm: any) => {
          // Handle Distilled Water specially
          if (rm.name.toLowerCase() === "distilled water") {
            return {
              ...rm,
              materialId: "distilled-water",
              costPerUnit: 0,
              calculatedCost: 0,
              unit: "oz"
            };
          }

          const material = materials.find(m => m.name.toLowerCase() === rm.name.toLowerCase());
          if (material) {
            const unitSize = getMaterialBaseUnitSize(material);
            const costPerBaseUnit = material.costPerUnit / unitSize;
            return {
              ...rm,
              materialId: material.id,
              costPerUnit: material.costPerUnit,
              calculatedCost: costPerBaseUnit * rm.quantityUsed,
              unit: material.unit
            };
          }
          return null;
        })
        .filter((m: any) => m !== null);

      if (recipe.materials.length === 0) {
        throw new Error("Could not match any generated materials to your inventory. Please try again.");
      }

      setGeneratedRecipe(recipe);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("503") || err.message?.includes("high demand")) {
        setError("The AI models are currently experiencing high demand. Please wait a minute and try again.");
      } else {
        setError(err.message || "Failed to generate recipe.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRecipe) return;
    setSaving(true);
    try {
      const totalCost = generatedRecipe.materials.reduce((sum: number, m: any) => sum + (m.calculatedCost || 0), 0);
      const profitMargin = 60; // Default 60%
      const suggestedPrice = totalCost / (1 - (profitMargin / 100));

      const productData = {
        name: generatedRecipe.name,
        type: generatedRecipe.type || "Candle",
        formula: generatedRecipe.formula, // Store the formula (EcoBase or Dulceria)
        description: generatedRecipe.description,
        materials: generatedRecipe.materials.map((m: any) => {
          const mat: any = {
            materialId: m.materialId,
            quantityUsed: m.quantityUsed,
            unit: m.unit === "Piece Bag" ? "pcs" : "oz"
          };
          if (m.percentage !== undefined && m.percentage !== null) {
            mat.percentage = m.percentage;
          }
          return mat;
        }),
        totalCost,
        profitMargin,
        suggestedPrice
      };

      await api.addProduct(productData);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">AI Recipe Generator</h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
              <p className="text-zinc-500 font-medium">Analyzing inventory...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-900 font-bold mb-1">Generation Error</h3>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                <div className="mt-4 flex gap-4">
                  <button 
                    onClick={fetchMaterials}
                    className="text-xs font-bold text-red-600 uppercase tracking-widest hover:underline"
                  >
                    Refresh Materials
                  </button>
                  <button 
                    onClick={generateRecipe}
                    className="text-xs font-bold text-red-600 uppercase tracking-widest hover:underline"
                  >
                    Try Generating Again
                  </button>
                </div>
              </div>
            </div>
          ) : !generatedRecipe ? (
            <div className="text-center space-y-6 py-4">
              <div className="max-w-sm mx-auto">
                <div className="flex justify-center -space-x-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border-4 border-white flex items-center justify-center text-zinc-400">
                    <Beaker className="w-8 h-8" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border-4 border-white flex items-center justify-center text-zinc-400">
                    <Scale className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">Create something new</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                  I'll analyze your current inventory and suggest a unique candle blend with optimized proportions.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="text-left space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">What are you making?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Auto", "Candle", "Room Spray"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setProductType(t)}
                        className={cn(
                          "px-3 py-2 text-xs font-bold rounded-xl border transition-all",
                          productType === t
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200"
                            : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-left space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Optional Theme or Mood</label>
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder={productType === "Room Spray" 
                      ? "e.g. Refreshing linen, relaxing lavender, or an invigorating citrus blast for the office..."
                      : "e.g. A cozy winter evening by the fireplace, or a refreshing tropical beach vibe..."}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none resize-none h-24"
                  />
                </div>

                {productType === "Room Spray" && (
                  <p className="text-[10px] text-zinc-400 italic">
                    * AI will automatically choose between EcoBase (1:3 water) and Dulceria formulas based on your inventory.
                  </p>
                )}

                <button
                  onClick={generateRecipe}
                  disabled={generating}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Recipe
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest",
                    generatedRecipe.type === "Room Spray" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {generatedRecipe.type}
                  </span>
                  {generatedRecipe.formula && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-zinc-100 text-zinc-600">
                      {generatedRecipe.formula} Formula
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{generatedRecipe.name}</h3>
                <p className="text-zinc-500 italic text-lg leading-relaxed">"{generatedRecipe.description}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                  <div className="flex items-center gap-2 mb-4 text-zinc-400">
                    <Droplets className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ingredients</span>
                  </div>
                  <ul className="space-y-3">
                    {generatedRecipe.materials.map((m: any, i: number) => (
                      <li key={i} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-700">{m.name}</span>
                          {m.percentage && (
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                              {m.percentage}% of blend
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-zinc-900">{m.quantityUsed}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 text-white/40">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Estimated Cost</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-4xl font-black">
                      ${generatedRecipe.materials.reduce((sum: number, m: any) => sum + (m.calculatedCost || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Calculated based on your current material costs in inventory.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={generateRecipe}
                  disabled={generating}
                  className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
                  Regenerate
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save to Products
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
