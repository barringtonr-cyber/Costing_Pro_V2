import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, 
  Printer, 
  Settings2, 
  Layout, 
  FileText,
  Type,
  Download,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

interface Product {
  id: string;
  name: string;
  type?: string;
  description?: string;
  suggestedPrice: number;
}

interface LabelGeneratorProps {
  product: Product;
  onClose: () => void;
}

interface LabelConfig {
  rows: number;
  cols: number;
  marginTop: number;
  marginLeft: number;
  rowGap: number;
  colGap: number;
  labelWidth: number;
  labelHeight: number;
  showPrice: boolean;
  showDescription: boolean;
  showType: boolean;
  showLogo: boolean;
  fontSize: number;
  titleFontSize: number;
}

const PRESETS = [
  {
    name: 'Standard Avery 5160 (30 Labels)',
    config: {
      rows: 10,
      cols: 3,
      marginTop: 12.7,
      marginLeft: 4.8,
      rowGap: 0,
      colGap: 3.2,
      labelWidth: 66.7,
      labelHeight: 25.4,
      fontSize: 8,
      titleFontSize: 12
    }
  },
  {
    name: 'Avery 5164 (6 Large Labels)',
    config: {
      rows: 3,
      cols: 2,
      marginTop: 12.7,
      marginLeft: 12.7,
      rowGap: 0,
      colGap: 3.2,
      labelWidth: 101.6,
      labelHeight: 84.7,
      fontSize: 12,
      titleFontSize: 24
    }
  },
  {
    name: '2" Square Labels (20 per sheet)',
    config: {
      rows: 5,
      cols: 4,
      marginTop: 12.7,
      marginLeft: 12.7,
      rowGap: 5,
      colGap: 5,
      labelWidth: 50.8,
      labelHeight: 50.8,
      fontSize: 10,
      titleFontSize: 14
    }
  }
];

export default function LabelGenerator({ product, onClose }: LabelGeneratorProps) {
  const [config, setConfig] = useState<LabelConfig>({
    rows: 10,
    cols: 3,
    marginTop: 12.7,
    marginLeft: 4.8,
    rowGap: 0,
    colGap: 3.2,
    labelWidth: 66.7,
    labelHeight: 25.4,
    showPrice: true,
    showDescription: true,
    showType: true,
    showLogo: true,
    fontSize: 8,
    titleFontSize: 12
  });

  const [profile, setProfile] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const p = await api.getProfile();
        setProfile(p);
      } catch (err) {
        console.error("Error fetching profile for labels:", err);
      }
    };
    fetchProfile();
  }, []);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const {
        rows,
        cols,
        marginTop,
        marginLeft,
        rowGap,
        colGap,
        labelWidth,
        labelHeight,
        showPrice,
        showDescription,
        showType,
        showLogo,
        fontSize,
        titleFontSize
      } = config;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = marginLeft + c * (labelWidth + colGap);
          const y = marginTop + r * (labelHeight + rowGap);

          // Draw label border (optional helper for debugging/alignment)
          // doc.setDrawColor(240);
          // doc.rect(x, y, labelWidth, labelHeight);

          let currentY = y + 5;

          // Logo
          if (showLogo && profile?.logoUrl) {
            try {
              // Note: Logo URL might need proxy/cors or base64 conversion
              // For simplicity in this env, we try to add it
              // doc.addImage(profile.logoUrl, 'PNG', x + (labelWidth/2) - 5, currentY, 10, 10);
              // currentY += 12;
            } catch (e) {
              console.warn("Could not add logo to label:", e);
            }
          }

          // Company Name
          if (profile?.companyName) {
            doc.setFontSize(fontSize - 2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(150, 150, 150);
            doc.text(profile.companyName.toUpperCase(), x + labelWidth / 2, currentY, { align: 'center' });
            currentY += (fontSize/2) + 1;
          }

          // Product Name
          doc.setFontSize(titleFontSize);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(product.name, x + labelWidth / 2, currentY + 2, { align: 'center' });
          currentY += (titleFontSize/2) + 4;

          // Type
          if (showType && product.type) {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(product.type.toUpperCase(), x + labelWidth / 2, currentY, { align: 'center' });
            currentY += (fontSize/2) + 2;
          }

          // Price
          if (showPrice) {
            doc.setFontSize(fontSize + 1);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`$${product.suggestedPrice.toFixed(2)}`, x + labelWidth / 2, currentY, { align: 'center' });
            currentY += (fontSize/2) + 2;
          }

          // Description
          if (showDescription && product.description) {
            doc.setFontSize(fontSize - 1);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 120, 120);
            const splitDesc = doc.splitTextToSize(product.description, labelWidth - 10);
            const descToPrint = splitDesc.slice(0, 2); // Only take first 2 lines
            doc.text(descToPrint, x + labelWidth / 2, currentY, { align: 'center' });
          }
        }
      }

      doc.save(`${product.name.replace(/\s+/g, '_')}_Labels.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setConfig({
      ...config,
      ...preset.config
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
        {/* Left: Preview & Settings */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-50 border-r border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">Label Generator</h2>
              <p className="text-sm text-zinc-500">Configure labels for {product.name}</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-wider">
                <Layout className="w-4 h-4" /> Layout Presets
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(p)}
                    className="text-left px-4 py-3 bg-white border border-zinc-200 rounded-xl hover:border-zinc-900 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900">{p.name}</span>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50 px-2 py-0.5 rounded">
                        {p.config.cols}x{p.config.rows}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-wider">
                <Settings2 className="w-4 h-4" /> Custom Configuration
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Rows</label>
                  <input 
                    type="number" 
                    value={config.rows} 
                    onChange={e => setConfig({...config, rows: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Columns</label>
                  <input 
                    type="number" 
                    value={config.cols} 
                    onChange={e => setConfig({...config, cols: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Width (mm)</label>
                  <input 
                    type="number" 
                    value={config.labelWidth} 
                    onChange={e => setConfig({...config, labelWidth: parseFloat(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Height (mm)</label>
                  <input 
                    type="number" 
                    value={config.labelHeight} 
                    onChange={e => setConfig({...config, labelHeight: parseFloat(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Top Margin (mm)</label>
                  <input 
                    type="number" 
                    value={config.marginTop} 
                    onChange={e => setConfig({...config, marginTop: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Left Margin (mm)</label>
                  <input 
                    type="number" 
                    value={config.marginLeft} 
                    onChange={e => setConfig({...config, marginLeft: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-200">
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-wider">
                <Type className="w-4 h-4" /> Content Options
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showPrice', label: 'Price' },
                  { key: 'showDescription', label: 'Description' },
                  { key: 'showType', label: 'Product Type' },
                  { key: 'showLogo', label: 'Company Logo' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setConfig({ ...config, [key]: !config[key as keyof LabelConfig] })}
                    className={`flex items-center justify-between px-4 py-2 rounded-xl border transition-all text-xs font-bold ${
                      config[key as keyof LabelConfig] 
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' 
                        : 'bg-white border-zinc-200 text-zinc-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Title Font Size</label>
                  <input 
                    type="number" 
                    value={config.titleFontSize} 
                    onChange={e => setConfig({...config, titleFontSize: parseInt(e.target.value) || 8})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium">Body Font Size</label>
                  <input 
                    type="number" 
                    value={config.fontSize} 
                    onChange={e => setConfig({...config, fontSize: parseInt(e.target.value) || 6})}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visual Guide & Actions */}
        <div className="w-full md:w-[400px] p-8 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 flex items-center justify-center aspect-[3/4] relative">
              <div className="absolute inset-4 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-zinc-300 mb-4" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-zinc-900">Sheet Preview</p>
                  <p className="text-xs text-zinc-500">{config.cols}x{config.rows} Layout</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{config.labelWidth}x{config.labelHeight}mm</p>
                </div>

                <div className="mt-8 grid gap-0.5" style={{ 
                  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                  padding: '10px'
                }}>
                  {Array.from({ length: Math.min(config.rows * config.cols, 24) }).map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-zinc-200 rounded-[1px]" />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Printer settings:</strong> When printing the PDF, ensure "Scale" is set to "100%" or "Actual Size" to maintain exact dimensions.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6">
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-zinc-900/10 active:scale-[0.98]"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Download PDF Labels
            </button>
            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Ready to print on 8.5 x 11" sheet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
