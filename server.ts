import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure JSON payload limit up to 50mb for receipt image/PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // AI-powered Receipt and Invoice Parsing Endpoint
  app.post("/api/receipt/import", async (req, res) => {
    try {
      const { fileData, mimeType, vendorMaterials } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "Missing file data or mime type" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const filePart = {
        inlineData: {
          mimeType,
          data: fileData,
        },
      };

      const prompt = `Analyze this receipt or invoice carefully. Extract all individual line items representing purchased raw materials, including their quantity, cost/price per unit, and total.
Also extract any flat shipping, handling, or delivery charges.

Here are the existing materials we know about for this vendor:
${JSON.stringify(vendorMaterials, null, 2)}

For each line item extracted from the receipt:
1. Attempt to match it to an existing material from the list above. If a clear match is found by name or description, set "matchedMaterialId" to that material's ID, "isCustom" to false, and populate "customName" with an empty string.
2. If NO match is found in the list, set "matchedMaterialId" to "", "isCustom" to true, and populate "customName" with the material name as written on the receipt. Decide the most appropriate category for "customType" (must be one of: "Wax", "Fragrance", "Wicks", "Vessels", "Packaging", "Other"). Identify the unit of measure for "customUnit" (e.g. "oz", "lbs", "pcs", "units").
3. Extract the quantity purchased (as a string representing a decimal or integer).
4. Extract the unit cost (cost per unit) (as a string representing a decimal).
5. If there is a lot number or batch code associated with the item, populate "lotNumber", otherwise leave it empty.

Also extract the flat shipping or delivery cost if specified on the receipt (as a string representing a decimal, default to "0" if not specified).

Ensure the output conforms exactly to the requested JSON schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [filePart, { text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shippingCost: {
                type: Type.STRING,
                description: "The extracted shipping cost or flat handling fees, e.g. '12.50'. Defaults to '0'."
              },
              items: {
                type: Type.ARRAY,
                description: "The list of extracted material items.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    matchedMaterialId: {
                      type: Type.STRING,
                      description: "The ID of the matched existing material from the provided list, or empty string if custom/not found."
                    },
                    isCustom: {
                      type: Type.BOOLEAN,
                      description: "True if the item did not match any of the provided vendor materials."
                    },
                    customName: {
                      type: Type.STRING,
                      description: "The name of the custom/new material, or empty string if matched existing."
                    },
                    customType: {
                      type: Type.STRING,
                      description: "Must be one of: 'Wax', 'Fragrance', 'Wicks', 'Vessels', 'Packaging', 'Other'."
                    },
                    customUnit: {
                      type: Type.STRING,
                      description: "The unit of measure (e.g., 'oz', 'lbs', 'pcs', 'units')."
                    },
                    quantity: {
                      type: Type.STRING,
                      description: "The quantity of this item purchased."
                    },
                    costPerUnit: {
                      type: Type.STRING,
                      description: "The cost per unit for this item."
                    },
                    lotNumber: {
                      type: Type.STRING,
                      description: "The lot number or reference number, if present on the invoice/receipt."
                    }
                  },
                  required: ["matchedMaterialId", "isCustom", "customName", "customType", "customUnit", "quantity", "costPerUnit", "lotNumber"]
                }
              }
            },
            required: ["shippingCost", "items"]
          }
        }
      });

      const resultText = response.text || "{}";
      const parsedData = JSON.parse(resultText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Receipt parsing error:", error);
      res.status(500).json({ error: error.message || "Failed to process receipt" });
    }
  });



  // Vite middleware for development
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
  }

  // SPA Fallback - should be the very last route
  app.get("*", async (req, res, next) => {
    try {
      const isDev = process.env.NODE_ENV !== "production";
      const distIndex = path.resolve(__dirname, "dist", "index.html");
      
      if (!isDev && fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else if (vite) {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } else {
        // Fallback if vite is not initialized and .next doesn't exist (shouldn't happen)
        res.status(404).send("Application not ready. Please ensure the build is complete.");
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
