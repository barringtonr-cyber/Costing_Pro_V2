import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  FileDown,
  PieChart,
  Sparkles,
  Lock
} from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";

interface COGSProduct {
  productName: string;
  totalCost: number;
  totalQuantity: number;
}

interface ReportData {
  inventoryValue: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  cogsByProduct: COGSProduct[];
}

interface Sale {
  productName: string;
  totalPrice: number;
  totalCost: number;
  profit: number;
  createdAt: any;
}

export default function Dashboard() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { showAllData } = useAdmin();

  // Calendar filtering state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all"); // "all", "today", "yesterday", "week", "month", "year", "custom"
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = async () => {
    try {
      // Only allow showAllData if the user is actually an admin
      const effectiveAll = showAllData && isAdmin;
      
      const [rData, sData] = await Promise.all([
        api.getReports(effectiveAll),
        api.getSales(effectiveAll)
      ]);
      setReport(rData as any);
      setAllSales(sData as any);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      setError("Failed to load dashboard data. Please try refreshing.");
      // Provide an empty report to break the loading state if it was null
      if (!report) {
        setReport({
          inventoryValue: 0,
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0,
          cogsByProduct: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showAllData, isAdmin]);

  const filterOptions = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "custom", label: "Custom Range" },
  ];

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

  const getFilteredSales = () => {
    if (selectedFilter === "all") return allSales;

    const now = new Date();
    
    // Start of today (00:00:00)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of yesterday
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    // Start of this week (Sunday)
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    // Start of this month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of this year
    const currentYearStart = new Date(now.getFullYear(), 0, 1);

    return allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      
      switch (selectedFilter) {
        case "today":
          return saleDate >= todayStart;
        case "yesterday":
          return saleDate >= yesterdayStart && saleDate <= yesterdayEnd;
        case "week":
          return saleDate >= currentWeekStart;
        case "month":
          return saleDate >= currentMonthStart;
        case "year":
          return saleDate >= currentYearStart;
        case "custom":
          let matches = true;
          if (startDate) {
            const start = new Date(startDate + "T00:00:00");
            matches = matches && saleDate >= start;
          }
          if (endDate) {
            const end = new Date(endDate + "T23:59:59");
            matches = matches && saleDate <= end;
          }
          return matches;
        default:
          return true;
      }
    });
  };

  const filteredSales = getFilteredSales();

  const totalSalesValue = filteredSales.reduce((sum, s: any) => sum + (s.totalPrice || 0), 0);
  const totalCostValue = filteredSales.reduce((sum, s: any) => sum + (s.totalCost || 0), 0);
  const totalProfitValue = filteredSales.reduce((sum, s: any) => sum + (s.profit || 0), 0);

  const cogsByProductMap = filteredSales.reduce((acc: any, s: any) => {
    const productName = s.productName || 'Unknown';
    if (!acc[productName]) {
      acc[productName] = { productName, totalCost: 0, totalQuantity: 0 };
    }
    acc[productName].totalCost += s.totalCost || 0;
    acc[productName].totalQuantity += s.quantitySold || 0;
    return acc;
  }, {});

  const displayedCogsByProduct: COGSProduct[] = (Object.values(cogsByProductMap) as COGSProduct[]).sort((a, b) => b.totalCost - a.totalCost);
  const recentDisplayedSales = filteredSales.slice(0, 5);

  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Business Performance Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);
    doc.text(`Period: ${getFilterLabel()}`, 14, 36);

    // Summary Stats
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Inventory Value', `$${report.inventoryValue.toFixed(2)}`],
        ['Total Sales Revenue', `$${totalSalesValue.toFixed(2)}`],
        ['Total Cost of Goods (COGS)', `$${totalCostValue.toFixed(2)}`],
        ['Total Net Profit', `$${totalProfitValue.toFixed(2)}`],
      ],
      theme: 'striped',
    });

    // COGS Breakdown
    doc.setFontSize(16);
    doc.text("COGS Breakdown by Product", 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Product', 'Quantity Sold', 'Total COGS']],
      body: (displayedCogsByProduct || []).map(p => [
        p.productName,
        p.totalQuantity.toString(),
        `$${p.totalCost.toFixed(2)}`
      ]),
    });

    doc.save(`business-report-${getFilterLabel().toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div>
          <p className="text-sm text-zinc-500 font-medium">Loading Overview...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const stats = [
    {
      name: "Total Inventory Value",
      value: `$${report.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "Current value of raw materials"
    },
    {
      name: "Total Sales Revenue",
      value: `$${totalSalesValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      color: "text-green-600",
      bg: "bg-green-50",
      description: selectedFilter === "all" ? "Lifetime revenue recorded" : `${getFilterLabel()} revenue`
    },
    {
      name: "Total Cost of Goods",
      value: `$${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Activity,
      color: "text-red-600",
      bg: "bg-red-50",
      description: selectedFilter === "all" ? "Lifetime cost of materials sold" : `${getFilterLabel()} material cost`
    },
    {
      name: "Total Net Profit",
      value: `$${totalProfitValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-zinc-900",
      bg: "bg-zinc-100",
      description: selectedFilter === "all" ? "Lifetime profit (Revenue - Cost)" : `${getFilterLabel()} profit`
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Business Overview</h1>
          <p className="text-zinc-500 text-sm">Track your key performance indicators and inventory health.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          
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
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-zinc-500 mb-1">{stat.name}</p>
              <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{stat.value}</h3>
              <p className="text-xs text-zinc-400 mt-2">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* COGS & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* COGS Breakdown */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">COGS Breakdown</h2>
              </div>
              <span className="text-xs text-zinc-500 font-medium">By Product</span>
            </div>
            <div className="p-6">
              {(displayedCogsByProduct && displayedCogsByProduct.length > 0) ? (
                <div className="space-y-4">
                  {displayedCogsByProduct.map((p, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-zinc-700">{p.productName}</span>
                        <span className="font-bold text-zinc-900">${p.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-zinc-900 transition-all duration-1000"
                          style={{ width: `${(p.totalCost / (totalCostValue || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 uppercase font-bold">
                        <span>{p.totalQuantity} Units Sold</span>
                        <span>{((p.totalCost / (totalCostValue || 1)) * 100).toFixed(1)}% of total COGS</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400 text-sm">No sales data to display COGS breakdown.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Recent Sales Performance</h2>
              <span className="text-xs text-zinc-500 font-medium">Latest Transactions</span>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              {recentDisplayedSales.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {recentDisplayedSales.map((sale, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-400 border border-zinc-200">
                              <ShoppingCart className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{sale.productName}</p>
                              <p className="text-[10px] text-zinc-500">
                                {sale.createdAt ? format(new Date(sale.createdAt), "MMM d, h:mm a") : "Just now"}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-zinc-900">${sale.totalPrice.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                  <p className="text-zinc-500 font-medium">No sales recorded yet.</p>
                  <p className="text-xs text-zinc-400 mt-1">Record a sale to see your performance here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-zinc-900 text-white rounded-2xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[400px]">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
            
            <div className="relative space-y-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold mb-2">Business Health</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Your current inventory value is <span className="text-white font-bold">${report.inventoryValue.toFixed(2)}</span>. 
                  {totalProfitValue > 0 ? " You're operating profitably!" : " Start recording sales to track your growth."}
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Profitability Ratio</span>
                  <span className="text-xs font-bold text-white">{totalSalesValue > 0 ? ((totalProfitValue / totalSalesValue) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(100, Math.max(0, totalSalesValue > 0 ? (totalProfitValue / totalSalesValue) * 100 : 0))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 pt-8 border-t border-white/10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-4 tracking-widest">Quick Tips</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                  Review low stock materials regularly.
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                  Adjust profit margins based on demand.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
