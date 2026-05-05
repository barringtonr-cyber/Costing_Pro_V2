import * as React from "react";
import { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Save,
  Store,
  ExternalLink,
  Pencil,
  Printer
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";
import { vendorSchema } from "../lib/validation";
import { z } from "zod";
import { cn } from "../lib/utils";

interface Vendor {
  id: string;
  name: string;
  address?: string;
  website?: string;
}

export default function Vendors() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showAllData } = useAdmin();

  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number } | null>(null);

  const fetchVendors = async () => {
    try {
      const effectiveAll = showAllData && isAdmin;
      const data = await api.getVendors(effectiveAll);
      setVendors(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await api.cleanupDuplicates() as any;
      setCleanupResult({ deletedCount: result.deletedVendors });
      fetchVendors();
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("Failed to cleanup duplicates.");
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [showAllData, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const vendorData = { name, address, website };

    try {
      vendorSchema.parse(vendorData);

      if (editingId) {
        await api.updateVendor(editingId, vendorData);
      } else {
        await api.addVendor(vendorData);
      }
      fetchVendors();
      resetForm();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setFormErrors(errors);
      } else {
        console.error("Error saving vendor:", error);
        alert(error instanceof Error ? error.message : "Failed to save vendor");
      }
    }
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setWebsite("");
    setEditingId(null);
    setIsAdding(false);
    setFormErrors({});
  };

  const handleEdit = (vendor: Vendor) => {
    setName(vendor.name);
    setAddress(vendor.address || "");
    setWebsite(vendor.website || "");
    setEditingId(vendor.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteVendor(id);
      fetchVendors();
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting vendor:", error);
    }
  };

  const filteredVendors = vendors
    .filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Vendor List Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Vendor Name', 'Address', 'Website']],
      body: filteredVendors.map(v => [
        v.name,
        v.address || "N/A",
        v.website || "N/A"
      ]),
    });

    doc.save(`vendor-list-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vendor List</h1>
          <p className="text-zinc-500 text-sm">Manage your suppliers and material sources.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCleanupModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
          >
            <Store className="w-4 h-4" />
            Cleanup Duplicates
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6">
            {!cleanupResult ? (
              <>
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Cleanup Vendors?</h3>
                  <p className="text-sm text-zinc-500">
                    This will find and remove redundant vendor entries with the exact same name.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={isCleaning}
                    onClick={() => setShowCleanupModal(false)}
                    className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-medium hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isCleaning}
                    onClick={handleCleanup}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCleaning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      "Start Cleanup"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                    <Save className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Cleanup Complete!</h3>
                  <div className="bg-zinc-50 rounded-xl p-4 space-y-2 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Redundant vendors removed:</span>
                      <span className="font-bold text-zinc-900">{cleanupResult.deletedCount}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCleanupModal(false);
                    setCleanupResult(null);
                  }}
                  className="w-full px-4 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <div className="bg-white p-4 border border-zinc-200 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Total Vendors</p>
            <p className="text-xl font-bold text-zinc-900">{vendors.length}</p>
          </div>
        </div>
      </div>

      {/* Add Form Overlay */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">{editingId ? "Edit Vendor" : "Add New Vendor"}</h2>
              <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Vendor Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CandleScience"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-colors",
                    formErrors.name ? "border-red-500 focus:ring-red-500" : "border-zinc-200"
                  )}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State, ZIP"
                  rows={2}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
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
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update Vendor" : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length > 0 ? (
          filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{vendor.name}</h3>
                    {vendor.address && <p className="text-xs text-zinc-500 mt-1">{vendor.address}</p>}
                    <p className="text-xs text-zinc-400 mt-1">Supplier</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(vendor.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Quick Actions</span>
                <div className="flex gap-2">
                  {vendor.website && (
                    <a 
                      href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="Visit Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(vendor.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                    title="Search Vendor"
                  >
                    <Search className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            No vendors found. Add your first supplier to get started.
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Vendor?</h3>
              <p className="text-sm text-zinc-500">Are you sure you want to delete this vendor? This will not delete materials associated with them, but it cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
