import * as React from "react";
import { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Save,
  ShoppingCart,
  TrendingUp,
  History,
  AlertCircle,
  Printer
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";

interface Product {
  id: string;
  name: string;
  totalCost: number;
  suggestedPrice: number;
}

interface Customer {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantitySold: number;
  totalPrice: number;
  totalCost: number;
  profit: number;
  customerId: string | null;
  createdAt: any;
}

export default function Sales() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAllData } = useAdmin();

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [quantitySold, setQuantitySold] = useState("1");

  const fetchData = async () => {
    try {
      const effectiveAll = showAllData && isAdmin;
      const [sData, pData, cData] = await Promise.all([
        api.getSales(effectiveAll),
        api.getProducts(effectiveAll),
        api.getCustomers(effectiveAll)
      ]);
      setSales(sData as any);
      setProducts(pData as any);
      setCustomers(cData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showAllData, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = parseInt(quantitySold);
    const totalPrice = product.suggestedPrice * qty;
    const totalCost = product.totalCost * qty;
    const profit = totalPrice - totalCost;

    try {
      await api.addSale({
        productId: product.id,
        productName: product.name,
        quantitySold: qty,
        totalPrice,
        totalCost,
        profit,
        customerId: selectedCustomerId ? parseInt(selectedCustomerId) : null,
      });
      fetchData();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setSelectedProductId("");
    setSelectedCustomerId("");
    setQuantitySold("1");
    setIsAdding(false);
    setError(null);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Product', 'Qty', 'Total Price', 'Profit']],
      body: sales.map(s => [
        format(new Date(s.createdAt), "MMM d, yyyy h:mm a"),
        s.productName,
        s.quantitySold,
        `$${s.totalPrice.toFixed(2)}`,
        `$${s.profit.toFixed(2)}`
      ]),
    });

    doc.save(`sales-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Sales Tracking</h1>
          <p className="text-zinc-500 text-sm">Record your sales and track inventory reduction.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Sale
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Record New Sale</h2>
              <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Select Product</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                >
                  <option value="">Choose a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${p.suggestedPrice.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Select Customer (Optional)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Quantity Sold</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={quantitySold}
                  onChange={(e) => setQuantitySold(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              {selectedProductId && (
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Unit Price</span>
                    <span className="font-medium">${products.find(p => p.id === selectedProductId)?.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-200">
                    <span className="text-zinc-900">Total Price</span>
                    <span className="text-zinc-900">
                      ${((products.find(p => p.id === selectedProductId)?.suggestedPrice || 0) * parseInt(quantitySold || "0")).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedProductId}
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Recent Sales</h2>
          </div>
          <span className="text-xs text-zinc-500 font-medium">Showing last 50 sales</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Price</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {format(new Date(sale.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-900">
                      {sale.productName}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      {sale.quantitySold}
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900">
                      ${sale.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 font-bold">
                        +${sale.profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
