import React, { useState, useEffect } from "react";
import { Save, Building2, Image as ImageIcon, CheckCircle2, Download, Upload, Database, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await api.getProfile() as any;
        if (profile) {
          setCompanyName(profile.companyName || "");
          setLogoUrl(profile.logoUrl || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        companyName,
        logoUrl
      });
      setNotification({ type: 'success', message: 'Settings saved successfully!' });
    } catch (err) {
      console.error("Error saving settings:", err);
      setNotification({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-2">Manage your app branding and data.</p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-zinc-500" />
                <h2 className="text-lg font-bold text-zinc-900">Report Branding</h2>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Customize how your reports and company information appear.
              </p>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
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
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-bold text-zinc-900">Data Management</h2>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-sm font-bold text-zinc-900 mb-1">Backup & Restore</p>
                <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                  Export your entire database to a JSON file for safe keeping.
                </p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isBackingUp ? <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    Create Backup
                  </button>
                  
                  <label className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium cursor-pointer",
                    isRestoring && "opacity-50 cursor-not-allowed pointer-events-none"
                  )}>
                    {isRestoring ? <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                    Restore Backup
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={isRestoring} />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-bold text-red-900 mb-1">Danger Zone</p>
                <p className="text-xs text-red-600 mb-4 leading-relaxed">
                  Permanently delete all your local data.
                </p>
                
                {showResetConfirm ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-red-700">Are you absolutely sure?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetData}
                        disabled={isResetting}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium w-full"
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
    </div>
  );
}
