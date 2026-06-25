import React, { useState, useEffect } from "react";
import { 
  Save, 
  Building2, 
  Image as ImageIcon, 
  CheckCircle2, 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  Sparkles, 
  User, 
  Sliders, 
  Tags, 
  Plus, 
  Pencil, 
  Check, 
  X, 
  AlertTriangle 
} from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";

const DEFAULT_TYPES = ["Wax", "Wicks", "Fragrance", "Vessels", "Diffuser Bottles", "Spray Base", "Diffuser Base", "Other"];

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");

  // Settings branding state
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [taxRate, setTaxRate] = useState<number>(8.75);

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Data management state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sync tab with URL search params
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await api.getProfile() as any;
        if (profile) {
          setCompanyName(profile.companyName || "");
          setLogoUrl(profile.logoUrl || "");
          setTaxRate(profile.taxRate !== undefined ? profile.taxRate : 8.75);
          setFirstName(profile.firstName || "");
          setLastName(profile.lastName || "");
          setAddress(profile.address || "");
          setCity(profile.city || "");
          setStateName(profile.state || "");
          setZip(profile.zip || "");
          setCategories(profile.customCategories || DEFAULT_TYPES);
        } else {
          setCategories(DEFAULT_TYPES);
        }
      } catch (err) {
        console.error("Error fetching branding/profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        firstName,
        lastName,
        address,
        city,
        state: stateName,
        zip
      });
      setNotification({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      console.error("Error saving profile:", err);
      setNotification({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        companyName,
        logoUrl,
        taxRate: Number(taxRate)
      });
      setNotification({ type: 'success', message: 'Branding settings saved successfully!' });
    } catch (err) {
      console.error("Error saving branding:", err);
      setNotification({ type: 'error', message: 'Failed to save branding settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setNotification({ type: 'error', message: 'Category already exists!' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory("");
    try {
      await api.updateProfile({ customCategories: updated });
      setNotification({ type: 'success', message: 'Category added successfully! Side menu updated.' });
    } catch (err) {
      console.error("Error adding category:", err);
      setNotification({ type: 'error', message: 'Failed to add category.' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleEditCategory = async (oldCat: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    if (trimmed === oldCat) {
      setEditingCategory(null);
      return;
    }
    if (categories.includes(trimmed) && trimmed !== oldCat) {
      setNotification({ type: 'error', message: 'Category already exists!' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    const updated = categories.map(cat => cat === oldCat ? trimmed : cat);
    setCategories(updated);
    setEditingCategory(null);
    try {
      await api.updateProfile({ customCategories: updated });
      setNotification({ type: 'success', message: 'Category renamed successfully!' });
    } catch (err) {
      console.error("Error editing category:", err);
      setNotification({ type: 'error', message: 'Failed to update category.' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const updated = categories.filter(cat => cat !== catToDelete);
    setCategories(updated);
    try {
      await api.updateProfile({ customCategories: updated });
      setNotification({ type: 'success', message: 'Category deleted successfully!' });
    } catch (err) {
      console.error("Error deleting category:", err);
      setNotification({ type: 'error', message: 'Failed to delete category.' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await api.cleanupDuplicates() as any;
      setNotification({ 
        type: 'success', 
        message: `Cleanup completed! Deleted ${result.deletedMaterials} materials, ${result.deletedVendors} vendors, and ${result.deletedProducts} products.` 
      });
    } catch (err) {
      console.error("Cleanup error:", err);
      setNotification({ type: 'error', message: 'Failed to cleanup duplicates.' });
    } finally {
      setIsCleaning(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const backup = await api.backupData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `costing_pro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: 'Backup created successfully!' });
    } catch (err) {
      console.error("Backup error:", err);
      setNotification({ type: 'error', message: 'Failed to create backup.' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backup = JSON.parse(event.target?.result as string);
          await api.restoreData(backup);
          setNotification({ type: 'success', message: 'Data restored successfully!' });
          window.location.reload(); 
        } catch (err) {
          console.error("Restore error:", err);
          setNotification({ type: 'error', message: 'Failed to restore data. Invalid backup file.' });
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("Restore error:", err);
      setNotification({ type: 'error', message: 'Failed to read backup file.' });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.resetData();
      setNotification({ type: 'success', message: 'All data has been successfully reset.' });
      window.location.reload();
    } catch (err) {
      console.error("Reset data failed:", err);
      setNotification({ type: 'error', message: 'Failed to reset data. Please try again.' });
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900" id="settings-title">Settings</h1>
        <p className="text-zinc-500 mt-2">Manage your app settings, branding and data.</p>
      </div>

      {notification && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        )}>
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Tabs list navigation */}
      <div className="flex border-b border-zinc-200 overflow-x-auto gap-6 no-scrollbar pb-[1px]" id="settings-tab-nav">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "branding", label: "Branding", icon: Sliders },
          { id: "categories", label: "Categories", icon: Tags },
          { id: "import-export", label: "Import/Export", icon: Database }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all relative top-[1px] whitespace-nowrap",
                isActive 
                  ? "border-zinc-900 text-zinc-900" 
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm max-w-4xl" id="panel-profile">
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-zinc-500" />
                <h2 className="text-lg font-bold text-zinc-900">Personal Information</h2>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Manage your personal contact details and shipping address.</p>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="NY"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Zip Code</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="10001"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm max-w-4xl" id="panel-branding">
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-zinc-500" />
                <h2 className="text-lg font-bold text-zinc-900">Report Branding</h2>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Customize how your reports and company information appear.
              </p>
            </div>
            
            <form onSubmit={handleSaveBranding} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your company name"
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRate === 0 ? "" : taxRate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTaxRate(val === "" ? 0 : parseFloat(val));
                        }}
                        placeholder="8.75"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none pr-12"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400 font-bold text-sm">
                        %
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Defaults to NY Sales Tax (8.75%). Allows custom rates.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Company Logo
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="relative group w-24 h-24 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
                          <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setLogoUrl("")}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-400 shrink-0 hover:border-zinc-400 transition-colors"
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onload = (event) => setLogoUrl(event.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        >
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium cursor-pointer">
                            <Upload className="w-4 h-4" />
                            {logoUrl ? "Change Logo" : "Upload Logo"}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => setLogoUrl(event.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Recommended: Square PNG or SVG with transparent background.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                        Or use a direct image URL
                      </label>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm max-w-4xl" id="panel-categories">
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-zinc-500" />
                <h2 className="text-lg font-bold text-zinc-900">Material Categories</h2>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Manage the types of materials used in your formulas and inventory. These will be added to the materials side menu dynamically in ascending order.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Packaging, Reeds"
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </form>

              <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
                {categories.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-sm">No categories configured.</div>
                ) : (
                  [...categories].sort((a,b) => a.localeCompare(b)).map((cat) => (
                    <div key={cat} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      {editingCategory === cat ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none text-sm"
                            autoFocus
                            required
                          />
                          <button
                            onClick={() => handleEditCategory(cat)}
                            className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1.5 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-zinc-950">{cat}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditingValue(cat);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all"
                              title="Rename Category"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${cat}"? Materials already assigned to this category will keep their type, but "${cat}" will be removed from your menu filters.`)) {
                                  handleDeleteCategory(cat);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "import-export" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl" id="panel-import-export">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-zinc-500" />
                  <h2 className="text-lg font-bold text-zinc-900">Data Management</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-sm font-bold text-zinc-900 mb-1">Backup & Restore</p>
                    <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                      Export your entire database to a JSON file for safe keeping or restore from a previous export.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-900 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {isBackingUp ? <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                        Create Backup
                      </button>
                      
                      <label className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-900 rounded-xl hover:bg-zinc-50 transition-colors text-sm font-medium cursor-pointer",
                        isRestoring && "opacity-50 cursor-not-allowed pointer-events-none"
                      )}>
                        {isRestoring ? <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                        Restore Backup
                        <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={isRestoring} />
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                    <p className="text-sm font-bold text-amber-900 mb-1">Database Maintenance</p>
                    <p className="text-xs text-amber-600 mb-4 leading-relaxed">
                      Remove duplicate materials, vendors, and products by name automatically.
                    </p>
                    
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaning}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors text-sm font-medium w-full"
                    >
                      {isCleaning ? <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Cleanup Duplicates
                    </button>
                  </div>

                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <p className="text-sm font-bold text-red-900 mb-1">Danger Zone</p>
                    <p className="text-xs text-red-600 mb-4 leading-relaxed">
                      Permanently delete all your database tables, records, and history. This cannot be undone.
                    </p>
                    
                    {showResetConfirm ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-red-700 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4" />
                          Are you absolutely sure you want to delete all data?
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleResetData}
                            disabled={isResetting}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                          >
                            Yes, Reset All
                          </button>
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
