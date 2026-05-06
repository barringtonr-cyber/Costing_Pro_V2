import React, { useState, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Sparkles, 
  X, 
  Loader2, 
  Copy, 
  CheckCircle2,
  AlertCircle,
  FileText,
  ShoppingBag,
  Type as TypeIcon,
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";

interface ProductListingGeneratorProps {
  product: {
    name: string;
    description?: string;
    materials: { name: string; quantityUsed: number; unit: string }[];
    suggestedPrice: number;
  };
  onClose: () => void;
}

export default function ProductListingGenerator({ product, onClose }: ProductListingGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedListing, setGeneratedListing] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<"Etsy" | "Shopify" | "Instagram" | "Facebook">("Etsy");

  const generateListing = async () => {
    setGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        You are a professional e-commerce copywriter. Create a high-converting product listing for a handmade candle.
        
        Product Details:
        - Name: ${product.name}
        - Base Description: ${product.description || "A unique handmade candle."}
        - Ingredients/Materials: ${product.materials.map(m => `${m.name} (${m.quantityUsed}${m.unit})`).join(", ")}
        - Price: $${product.suggestedPrice.toFixed(2)}
        - Target Platform: ${platform}

        The listing should include:
        1. An attention-grabbing title.
        2. A compelling product description that highlights the mood and scent profile.
        3. A list of key features/benefits (e.g., long burn time, natural ingredients, unique scent).
        4. 5-7 relevant hashtags or tags for the platform.

        Return a JSON object with:
        - title: The product title
        - description: The main product description
        - features: An array of strings for key features
        - tags: An array of strings for hashtags/tags
        
        The response MUST be ONLY the JSON object.
      `;

      const responseConfig = {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              features: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "description", "features", "tags"]
          }
        }
      };

      let response;
      try {
        // Try the latest preview model first
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          ...responseConfig
        });
      } catch (err: any) {
        // If high demand (503), try the more stable gemini-flash-latest
        if (err.message?.includes("503") || err.message?.includes("high demand")) {
          console.log("Gemini 3 high demand, falling back to Gemini Flash Latest");
          response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            ...responseConfig
          });
        } else {
          throw err;
        }
      }

      const listing = JSON.parse(response.text);
      setGeneratedListing(listing);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("503") || err.message?.includes("high demand")) {
        setError("The AI models are currently experiencing high demand. Please wait a minute and try again.");
      } else {
        setError(err.message || "Failed to generate listing.");
      }
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    generateListing();
  }, [platform]);

  const copyToClipboard = () => {
    if (!generatedListing) return;
    const text = `
Title: ${generatedListing.title}

Description:
${generatedListing.description}

Features:
${generatedListing.features.map((f: string) => `- ${f}`).join("\n")}

Tags:
${generatedListing.tags.join(", ")}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Generate Product Listing</h2>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">AI Marketing Copy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="flex gap-2 mb-8 p-1 bg-zinc-100 rounded-2xl w-fit mx-auto">
            {(["Etsy", "Shopify", "Instagram", "Facebook"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                  platform === p 
                    ? "bg-white text-zinc-900 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {generating ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
              <p className="text-zinc-500 font-medium animate-pulse">Crafting your {platform} listing...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-900 font-bold mb-1">Generation Error</h3>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                <button 
                  onClick={generateListing}
                  className="mt-4 text-xs font-bold text-red-600 uppercase tracking-widest hover:underline flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> Try Again
                </button>
              </div>
            </div>
          ) : generatedListing ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Suggested Title</label>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">{generatedListing.title}</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Product Description</label>
                  <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                    <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">{generatedListing.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Key Features</label>
                    <ul className="space-y-2">
                      {generatedListing.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mt-1.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tags / Hashtags</label>
                    <div className="flex flex-wrap gap-2">
                      {generatedListing.tags.map((t: string, i: number) => (
                        <span key={i} className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-lg uppercase tracking-tighter">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-100">
                <button
                  onClick={generateListing}
                  className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex-[2] py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy All Text
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
