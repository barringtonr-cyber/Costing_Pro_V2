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
  AlertTriangle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const effectiveAll = showAllData && isAdmin;
        const [reportResult, profileResult] = await Promise.all([
          api.getReports(effectiveAll),
          api.getProfile()
        ]);
        setData(reportResult as any);
        setProfile(profileResult);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showAllData, user?.uid, isAdmin]);

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

  return (
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
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium text-zinc-600">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
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
  );
}
