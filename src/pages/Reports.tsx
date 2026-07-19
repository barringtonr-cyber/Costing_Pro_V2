import * as React from "react";
import { useState, useEffect } from "react";
import { api } from "../api";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Calendar,
  Printer,
  AlertTriangle,
  Search,
  ChefHat,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";

interface ReportData {
  inventoryValue: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  lowStockItems: {
    name: string;
    quantityInStock: number;
    minStockLevel: number;
    unit: string;
  }[];
  cogsByProduct: {
    productName: string;
    totalCost: number;
    totalQuantity: number;
  }[];
}

const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState<ReportData | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showAllData } = useAdmin();

  const [activeTab, setActiveTab] = useState<"analytics" | "recipes">("analytics");
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeSortBy, setRecipeSortBy] = useState<"name" | "type">("name");
  const [recipeSortOrder, setRecipeSortOrder] = useState<"asc" | "desc">("asc");

  const toggleRecipeSort = (field: "name" | "type") => {
    if (recipeSortBy === field) {
      setRecipeSortOrder(recipeSortOrder === "asc" ? "desc" : "asc");
    } else {
      setRecipeSortBy(field);
      setRecipeSortOrder("asc");
    }
  };

  // Calendar filtering state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all"); // "all", "today", "yesterday", "week", "month", "year", "custom"
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filterOptions = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "custom", label: "Custom Range" },
  ];

  const getFilterDates = () => {
    if (selectedFilter === "all") return { start: "", end: "" };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYearStart = new Date(now.getFullYear(), 0, 1);

    // Format helper
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (selectedFilter) {
      case "today":
        return { start: formatDate(todayStart), end: formatDate(now) };
      case "yesterday":
        return { start: formatDate(yesterdayStart), end: formatDate(yesterdayEnd) };
      case "week":
        return { start: formatDate(currentWeekStart), end: formatDate(now) };
      case "month":
        return { start: formatDate(currentMonthStart), end: formatDate(now) };
      case "year":
        return { start: formatDate(currentYearStart), end: formatDate(now) };
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: "", end: "" };
    }
  };

  const getFilterLabel = () => {
    if (selectedFilter === "all") return "All Time";
    if (selectedFilter === "today") return "Today";
    if (selectedFilter === "yesterday") return "Yesterday";
    if (selectedFilter === "week") return "This Week";
    if (selectedFilter === "month") return "This Month";
    if (selectedFilter === "year") return "This Year";
    if (selectedFilter === "custom") {
      if (startDate && endDate) {
        return `${format(new Date(startDate + "T00:00:00"), "MMM d")} - ${format(new Date(endDate + "T00:00:00"), "MMM d, yyyy")}`;
      } else if (startDate) {
        return `Since ${format(new Date(startDate + "T00:00:00"), "MMM d, yyyy")}`;
      } else if (endDate) {
        return `Until ${format(new Date(endDate + "T00:00:00"), "MMM d, yyyy")}`;
      }
      return "Custom Range";
    }
    return "All Time";
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const effectiveAll = showAllData && isAdmin;
        const filterDates = getFilterDates();
        const [reportResult, profileResult, productsResult, materialsResult] = await Promise.all([
          api.getReports(effectiveAll, filterDates.start, filterDates.end),
          api.getProfile(),
          api.getProducts(effectiveAll),
          api.getMaterials(effectiveAll)
        ]);
        setData(reportResult as any);
        setProfile(profileResult);
        setProducts(productsResult || []);
        setMaterials(materialsResult || []);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showAllData, user?.uid, isAdmin, selectedFilter, startDate, endDate]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;
  if (!data) return <div>No data available.</div>;

  const profitMargin = data.totalSales > 0 ? (data.totalProfit / data.totalSales) * 100 : 0;

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Re-enabling crossOrigin because we are now using a CORS-friendly proxy (weserv.nl)
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const exportPDF = async () => {
    if (!data) return;
    
    const doc = new jsPDF();
    const isBusiness = true; // Subscriptions removed
    const companyName = profile?.companyName ? profile.companyName : "Costing Pro";
    const logoUrl = profile?.logoUrl ? profile.logoUrl : null;

    let currentY = 22;
    let textX = 14;

    if (logoUrl) {
      try {
        // Use an image proxy to bypass CORS issues
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}&output=png`;
        const img = await loadImage(proxiedUrl);
        
        // Maintain aspect ratio within a 30x30 box
        const scale = Math.min(30 / img.width, 30 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        try {
          // Try canvas method first
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            doc.addImage(dataUrl, 'PNG', 14, 10, w, h, undefined, 'FAST');
            textX = 50;
          }
        } catch (canvasError) {
          console.warn("Canvas conversion failed, trying direct addImage:", canvasError);
          doc.addImage(img, 'PNG', 14, 10, w, h, undefined, 'FAST');
          textX = 50;
        }
      } catch (e) {
        console.error("Error loading logo for PDF (even with proxy):", e);
        // Fallback to no logo layout
        textX = 14;
        currentY = 22;
      }
    }

    doc.setFontSize(20);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(companyName, textX, currentY);
    
    doc.setFontSize(12);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text("Business Performance Report", textX, currentY + 8);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, textX, currentY + 15);

    // Adjust starting Y for the table based on whether we had a logo/header
    const tableStartY = Math.max(currentY + 30, 50);

    doc.setFontSize(14);
    doc.setTextColor(24, 24, 27);
    doc.text("Financial Summary", 14, tableStartY - 5);
    
    autoTable(doc, {
      startY: tableStartY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales', `$${data.totalSales.toFixed(2)}`],
        ['Total Profit', `$${data.totalProfit.toFixed(2)}`],
        ['Inventory Value', `$${data.inventoryValue.toFixed(2)}`],
        ['Profit Margin', `${profitMargin.toFixed(1)}%`]
      ],
      headStyles: { fillColor: [24, 24, 27] },
      margin: { top: 20 }
    });

    if (data.lowStockItems && data.lowStockItems.length > 0) {
      doc.setFontSize(14);
      doc.text("Low Stock Alerts", 14, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Material', 'Current Stock', 'Min Level']],
        body: data.lowStockItems.map(item => [
          item.name,
          `${item.quantityInStock} ${item.unit}`,
          (item.minStockLevel || 0).toString()
        ]),
        headStyles: { fillColor: [220, 38, 38] }
      });
    }

    if (data.cogsByProduct && data.cogsByProduct.length > 0) {
      doc.setFontSize(14);
      doc.text("COGS by Product", 14, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Product Name', 'Total Quantity Sold', 'Total Cost (COGS)']],
        body: data.cogsByProduct.map(item => [
          item.productName,
          (item.totalQuantity || 0).toString(),
          `$${(item.totalCost || 0).toFixed(2)}`
        ]),
      });
    }

    doc.save(`business-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const getFormattedMaterials = (product: any) => {
    if (!product.materials) return "None";
    return product.materials.map((pm: any) => {
      const material = materials.find(m => m.id === pm.materialId);
      if (!material && pm.materialId === 'distilled-water') {
        return `Distilled Water (${pm.quantityUsed} oz)`;
      }
      if (!material) return `${pm.name || 'Unknown'} (${pm.quantityUsed} ${pm.unit || 'oz'})`;
      const unit = pm.unit || (material.unit === "Piece Bag" ? "pcs" : "oz");
      return `${material.name} (${pm.quantityUsed} ${unit})`;
    }).join(", ");
  };

  const getFormattedMaterialsList = (product: any) => {
    if (!product.materials) return "None";
    return product.materials.map((pm: any) => {
      const material = materials.find(m => m.id === pm.materialId);
      if (!material && pm.materialId === 'distilled-water') {
        return `• Distilled Water (${pm.quantityUsed} oz)`;
      }
      if (!material) return `• ${pm.name || 'Unknown'} (${pm.quantityUsed} ${pm.unit || 'oz'})`;
      const unit = pm.unit || (material.unit === "Piece Bag" ? "pcs" : "oz");
      return `• ${material.name} (${pm.quantityUsed} ${unit})`;
    }).join("\n");
  };

  const exportRecipeLogPDF = async () => {
    if (!products || products.length === 0) return;
    
    const doc = new jsPDF();
    const companyName = profile?.companyName ? profile.companyName : "Costing Pro";
    const logoUrl = profile?.logoUrl ? profile.logoUrl : null;

    let currentY = 22;
    let textX = 14;

    if (logoUrl) {
      try {
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}&output=png`;
        const img = await loadImage(proxiedUrl);
        const scale = Math.min(30 / img.width, 30 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            doc.addImage(dataUrl, 'PNG', 14, 10, w, h, undefined, 'FAST');
            textX = 50;
          }
        } catch (canvasError) {
          doc.addImage(img, 'PNG', 14, 10, w, h, undefined, 'FAST');
          textX = 50;
        }
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
        textX = 14;
        currentY = 22;
      }
    }

    doc.setFontSize(20);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(companyName, textX, currentY);
    
    doc.setFontSize(12);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text("Product Recipe Log", textX, currentY + 8);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, textX, currentY + 15);

    const tableStartY = Math.max(currentY + 30, 50);

    autoTable(doc, {
      startY: tableStartY,
      head: [['Product Name', 'Type', 'Description', 'Materials Used']],
      body: filteredRecipes.map(product => [
        product.name,
        product.type || "Candle",
        product.description || "No description provided.",
        getFormattedMaterialsList(product)
      ]),
      headStyles: { fillColor: [24, 24, 27] }, // zinc-900
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60 },
        3: { cellWidth: 55 }
      },
      styles: {
        fontSize: 10,
        valign: 'top',
        overflow: 'linebreak'
      },
      margin: { top: 20 }
    });

    doc.save(`product-recipe-log-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const filteredRecipes = products
    .filter(product => {
      const q = recipeSearch.toLowerCase();
      const nameMatch = product.name?.toLowerCase().includes(q);
      const descMatch = product.description?.toLowerCase().includes(q);
      return nameMatch || descMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (recipeSortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else {
        comparison = (a.type || "Candle").localeCompare(b.type || "Candle");
      }
      
      // Secondary sort alphabetically by name if values are identical
      if (comparison === 0) {
        return (a.name || "").localeCompare(b.name || "");
      }
      
      return recipeSortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Tab Selector */}
      <div className="flex border-b border-zinc-200 print:hidden mb-6">
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
            activeTab === "analytics"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Business Analytics
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
            activeTab === "recipes"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          )}
        >
          <ChefHat className="w-4 h-4" />
          Product Recipe Log
        </button>
      </div>

      {activeTab === "analytics" ? (
        <div className="space-y-8">
          {/* Branding Preview for Business Users */}
      {profile && (profile.companyName || profile.logoUrl) && (
        <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BarChart3 className="w-32 h-32" />
          </div>
          <div className="relative flex items-center gap-6">
            {profile.logoUrl && (
              <div className="w-20 h-20 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-lg">
                <img 
                  src={profile.logoUrl} 
                  alt="Logo" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Logo+Error";
                  }}
                />
              </div>
            )}
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Business Branding Active</p>
              <h2 className="text-2xl font-bold">{profile.companyName || "Your Company Name"}</h2>
              <p className="text-zinc-400 text-sm mt-1">Your custom branding will appear on all exported PDF reports.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Business Reports</h1>
          <p className="text-zinc-500 text-sm">Comprehensive overview of your business performance.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative" id="calendar-filter-dropdown-container">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-600 font-medium hover:bg-zinc-50 transition-colors shadow-sm",
                selectedFilter !== "all" && "border-zinc-950 text-zinc-950 bg-zinc-50/50 font-semibold"
              )}
            >
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>{getFilterLabel()}</span>
            </button>

            {isCalendarOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsCalendarOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl z-20 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Filter by Date</p>
                  <div className="space-y-1">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedFilter(opt.id);
                          if (opt.id !== "custom") {
                            setIsCalendarOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between",
                          selectedFilter === opt.id 
                            ? "bg-zinc-950 text-white" 
                            : "text-zinc-600 hover:bg-zinc-50"
                        )}
                      >
                        <span>{opt.label}</span>
                        {selectedFilter === opt.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedFilter === "custom" && (
                    <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => setIsCalendarOpen(false)}
                        className="w-full py-2 bg-zinc-950 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors mt-2"
                      >
                        Apply Filter
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button 
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Low Stock Section */}
      {data.lowStockItems && data.lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Inventory Alerts</h3>
              <p className="text-sm text-red-700">The following materials have fallen below their minimum stock levels.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.lowStockItems.map((item, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-red-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-zinc-900">{item.name}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Current: {item.quantityInStock} {item.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Min: {item.minStockLevel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              12%
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Total Sales</p>
          <p className="text-2xl font-bold text-zinc-900">${data.totalSales.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              8%
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Total Profit</p>
          <p className="text-2xl font-bold text-zinc-900">${data.totalProfit.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
              Current
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Inventory Value</p>
          <p className="text-2xl font-bold text-zinc-900">${data.inventoryValue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-zinc-600 bg-zinc-50 px-2 py-1 rounded-full">
              {profitMargin.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Avg. Margin</p>
          <p className="text-2xl font-bold text-zinc-900">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COGS by Product Chart */}
        <div className="lg:col-span-2 bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900">COGS by Product</h3>
            <p className="text-xs text-zinc-500">Cost of Goods Sold</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cogsByProduct || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="productName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e4e4e7', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="totalCost" radius={[4, 4, 0, 0]}>
                  {(data.cogsByProduct || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Breakdown Table */}
        <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6">Top Products by Cost</h3>
          <div className="space-y-4">
            {(data.cogsByProduct || []).slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.productName}</p>
                    <p className="text-xs text-zinc-500">{item.totalQuantity} units sold</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-zinc-900">${item.totalCost.toFixed(2)}</p>
              </div>
            ))}
            {data.cogsByProduct.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-8">No sales data recorded yet.</p>
            )}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
            View All Sales
          </button>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900">Financial Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Value</th>
                <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="px-6 py-4 text-sm text-zinc-600">Gross Revenue</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${data.totalSales.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Healthy</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-zinc-600">Cost of Goods Sold (COGS)</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${data.totalCost.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs font-medium text-zinc-600 bg-zinc-50 px-2 py-1 rounded-full">Standard</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-zinc-600">Net Profit</td>
                <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">${data.totalProfit.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Profitable</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-zinc-600">Inventory Asset Value</td>
                <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right">${data.inventoryValue.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Asset</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
      ) : (
        <div className="space-y-6">
          {/* Printable Header for standard browser print (normally hidden, shown on print) */}
          <div className="hidden print:block mb-8 border-b-2 border-zinc-900 pb-4">
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight uppercase">
              {profile?.companyName || "Costing Pro"}
            </h1>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">
              Master Product Recipe Log
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Generated on {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Product Recipe Log</h1>
              <p className="text-zinc-500 text-sm">Printers and exports for your product formulations and raw material specs.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Page
              </button>
              <button 
                onClick={exportRecipeLogPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Search/Filter bar */}
          <div className="relative print:hidden">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search recipes by product name or description..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-zinc-900">Formulation Recipes</h3>
              <span className="text-xs font-semibold text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-full">
                {filteredRecipes.length} {filteredRecipes.length === 1 ? "Product" : "Products"} sorted by {recipeSortBy === "name" ? "Name" : "Type"} ({recipeSortOrder === "asc" ? "A-Z" : "Z-A"})
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse print:text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 print:bg-zinc-100 print:border-b-2 print:border-zinc-300">
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider print:text-zinc-900 print:font-bold">
                      <button
                        onClick={() => toggleRecipeSort("name")}
                        className="flex items-center gap-1.5 hover:text-zinc-900 transition-colors focus:outline-none font-bold text-left uppercase tracking-wider print:pointer-events-none"
                      >
                        <span>Product Name</span>
                        <span className="print:hidden">
                          {recipeSortBy === "name" ? (
                            recipeSortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-zinc-900" /> : <ArrowDown className="w-3 h-3 text-zinc-900" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-zinc-300 hover:text-zinc-400" />
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider print:text-zinc-900 print:font-bold">
                      <button
                        onClick={() => toggleRecipeSort("type")}
                        className="flex items-center gap-1.5 hover:text-zinc-900 transition-colors focus:outline-none font-bold text-left uppercase tracking-wider print:pointer-events-none"
                      >
                        <span>Type</span>
                        <span className="print:hidden">
                          {recipeSortBy === "type" ? (
                            recipeSortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-zinc-900" /> : <ArrowDown className="w-3 h-3 text-zinc-900" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-zinc-300 hover:text-zinc-400" />
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider print:text-zinc-900 print:font-bold">Description</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider print:text-zinc-900 print:font-bold">Materials Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 print:divide-zinc-200">
                  {filteredRecipes.map((product) => (
                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors print:hover:bg-transparent">
                      <td className="px-6 py-4 text-sm font-semibold text-zinc-900 align-top max-w-[150px] break-words print:text-xs">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 align-top print:text-xs print:text-zinc-800">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 print:p-0 print:bg-transparent print:text-xs print:font-semibold">
                          {product.type || "Candle"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500 align-top max-w-[250px] break-words italic print:text-xs print:text-zinc-800">
                        {product.description || <span className="text-zinc-300 not-italic">No description provided.</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 align-top print:text-xs">
                        <ul className="space-y-1">
                          {product.materials && product.materials.length > 0 ? (
                            product.materials.map((pm: any, idx: number) => {
                              const material = materials.find(m => m.id === pm.materialId);
                              let matName = pm.name || "Unknown";
                              let matUnit = pm.unit || "oz";
                              if (material) {
                                matName = material.name;
                                matUnit = pm.unit || (material.unit === "Piece Bag" ? "pcs" : "oz");
                              } else if (pm.materialId === 'distilled-water') {
                                matName = "Distilled Water";
                                matUnit = "oz";
                              }
                              return (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 print:bg-zinc-500" />
                                  <span>{matName} <span className="text-zinc-400 font-medium font-mono text-[11px] print:text-zinc-600">({pm.quantityUsed} {matUnit})</span></span>
                                </li>
                              );
                            })
                          ) : (
                            <span className="text-zinc-300">No materials assigned.</span>
                          )}
                        </ul>
                      </td>
                    </tr>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">
                        {products.length === 0 ? (
                          <div className="space-y-1">
                            <p className="font-bold">No products created yet.</p>
                            <p className="text-zinc-400 text-xs">Create formulation recipes on the Products page first.</p>
                          </div>
                        ) : (
                          "No formulation recipes match your search."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
