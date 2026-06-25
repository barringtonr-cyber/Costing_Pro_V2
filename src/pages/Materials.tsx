import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save,
  Package,
  DollarSign,
  Layers,
  FileUp,
  Download,
  Store,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Database,
  Upload,
  Sparkles,
  History,
  ArrowRightLeft,
  Copy
} from "lucide-react";
import { cn } from "../lib/utils";
import Papa from "papaparse";
import { format } from "date-fns";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";
import { AlertCircle } from "lucide-react";

interface Material {
  id: string;
  name: string;
  type: string;
  vendor: string;
  costPerUnit: number;
  quantityInStock: number;
  minStockLevel: number;
  unit: string;
  piecesPerBag?: number;
}

interface Vendor {
  id: string;
  name: string;
}

const DEFAULT_TYPES = ["Wax", "Wicks", "Fragrance", "Vessels", "Diffuser Bottles", "Spray Base", "Diffuser Base", "Other"];
const DEFAULT_WAX_UNITS = ["5 lbs", "10 lbs", "15 lbs", "20 lbs", "Slabs"];
const DEFAULT_OZ_UNITS = ["0.5", "2", "4", "6", "8", "12", "16"];
const DEFAULT_WICK_UNITS = ["Piece Bag", "Inches", "Waxed", "Pre-Waxed"];

export default function Materials() {
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get("type");
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES);
  const [waxUnits, setWaxUnits] = useState<string[]>(DEFAULT_WAX_UNITS);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonFileInputRef] = [useRef<HTMLInputElement>(null)];
  const { showAllData } = useAdmin();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPro = true; // Subscriptions removed
  const isAtLimit = false;

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("Wax");
  const [customType, setCustomType] = useState("");
  const [vendor, setVendor] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [quantityInStock, setQuantityInStock] = useState("1");
  const [minStockLevel, setMinStockLevel] = useState("5");
  const [unit, setUnit] = useState("5 lbs");
  const [customUnit, setCustomUnit] = useState("");
  const [piecesPerBag, setPiecesPerBag] = useState("1");
  const [sortColumn, setSortColumn] = useState<keyof Material | 'totalValue'>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number; updatedProductsCount: number } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<Material | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const getMaterialBaseUnitSize = (material: Material) => {
    if (!material || !material.unit) return 1;
    const unitStr = material.unit.toLowerCase();
    if (unitStr.includes("lb")) {
      return (parseFloat(unitStr) || 1) * 16;
    }
    if (unitStr === "piece bag") {
      return material.piecesPerBag || 1;
    }
    // If it's a number (like "8" for 8 oz), return that number
    const num = parseFloat(unitStr);
    return isNaN(num) ? 1 : num;
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchMaterials = async () => {
    try {
      const effectiveAll = showAllData && isAdmin;
      const [mList, vList, tList, uList, userProfile] = await Promise.all([
        api.getMaterials(effectiveAll),
        api.getVendors(effectiveAll),
        api.getMaterialTypes(effectiveAll),
        api.getMaterialUnits("Wax", effectiveAll),
        api.getProfile()
      ]);
      setMaterials(mList as any);
      setVendors(vList as any);
      
      const customCategories = (userProfile as any)?.customCategories || DEFAULT_TYPES;
      // Merge custom categories with types from database
      const mergedTypes = Array.from(new Set([...customCategories, ...tList]));
      // Sort alphabetically (ascending)
      mergedTypes.sort((a, b) => a.localeCompare(b));
      setTypes(mergedTypes);

      // Merge default wax units with units from database
      const mergedWaxUnits = Array.from(new Set([...DEFAULT_WAX_UNITS, ...uList]));
      setWaxUnits(mergedWaxUnits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const logs = await api.getStockLogs(id);
      setHistoryLogs(logs);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal || !adjustAmount) return;

    setIsAdjusting(true);
    try {
      const change = parseFloat(adjustAmount);
      const newQuantity = showAdjustModal.quantityInStock + change;
      
      await Promise.all([
        api.updateMaterial(showAdjustModal.id, { quantityInStock: newQuantity }),
        api.addStockLog({
          materialId: showAdjustModal.id,
          change,
          type: 'adjustment',
          note: adjustNote
        })
      ]);

      setNotification({ message: 'Stock adjusted successfully!', type: 'success' });
      fetchMaterials();
      setShowAdjustModal(null);
      setAdjustAmount("");
      setAdjustNote("");
    } catch (err) {
      console.error("Error adjusting stock:", err);
      setNotification({ message: 'Failed to adjust stock.', type: 'error' });
    } finally {
      setIsAdjusting(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [showAllData, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalType = type === "Other" ? customType : type;
    const finalUnit = unit === "Other" ? customUnit : unit;

    const materialData = {
      name,
      type: finalType,
      vendor,
      costPerUnit: parseFloat(costPerUnit),
      quantityInStock: parseFloat(quantityInStock),
      minStockLevel: parseFloat(minStockLevel) || 0,
      unit: finalUnit,
      piecesPerBag: type === "Wicks" ? parseInt(piecesPerBag) : 1,
    };

    try {
      if (editingId) {
        await api.updateMaterial(editingId, materialData);
      } else {
        await api.addMaterial(materialData);
      }
      fetchMaterials();
      resetForm();
    } catch (error) {
      console.error("Error saving material:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setType("Wax");
    setCustomType("");
    setVendor("");
    setCostPerUnit("");
    setQuantityInStock("1");
    setMinStockLevel("5");
    setUnit("5 lbs");
    setCustomUnit("");
    setPiecesPerBag("1");
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (material: Material) => {
    setName(material.name);
    if (DEFAULT_TYPES.includes(material.type)) {
      setType(material.type);
      setCustomType("");
    } else {
      setType("Other");
      setCustomType(material.type);
    }
    setVendor(material.vendor || "");
    setCostPerUnit(material.costPerUnit.toString());
    setQuantityInStock(material.quantityInStock.toString());
    
    // Default to 1 for Fragrance, 5 for others if not set
    // Also handle old default of 5 for fragrances
    let effectiveMin = material.minStockLevel;
    if (material.type === "Fragrance" && (!effectiveMin || effectiveMin === 5)) {
      effectiveMin = 1;
    } else if (!effectiveMin) {
      effectiveMin = 5;
    }
    
    setMinStockLevel(effectiveMin.toString());
    
    if (material.type === "Wax") {
      if (DEFAULT_WAX_UNITS.includes(material.unit)) {
        setUnit(material.unit);
        setCustomUnit("");
      } else {
        setUnit("Other");
        setCustomUnit(material.unit);
      }
    } else if (material.type === "Wicks") {
      if (DEFAULT_WICK_UNITS.includes(material.unit)) {
        setUnit(material.unit);
        setCustomUnit("");
      } else {
        setUnit("Other");
        setCustomUnit(material.unit);
      }
    } else {
      if (DEFAULT_OZ_UNITS.includes(material.unit)) {
        setUnit(material.unit);
        setCustomUnit("");
      } else {
        setUnit("Other");
        setCustomUnit(material.unit);
      }
    }

    setPiecesPerBag((material.piecesPerBag || 1).toString());
    setEditingId(material.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMaterial(id);
      fetchMaterials();
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting material:", error);
    }
  };

  const handleDuplicate = async (material: Material) => {
    try {
      const duplicatedMaterial = {
        name: `${material.name} (Copy)`,
        type: material.type,
        vendor: material.vendor || "",
        costPerUnit: material.costPerUnit,
        quantityInStock: material.quantityInStock,
        minStockLevel: material.minStockLevel || 0,
        unit: material.unit,
        piecesPerBag: material.piecesPerBag || 1,
      };

      await api.addMaterial(duplicatedMaterial);
      fetchMaterials();
      setNotification({ message: `Duplicated "${material.name}" successfully!`, type: "success" });
    } catch (error) {
      console.error("Error duplicating material:", error);
      setNotification({ message: "Failed to duplicate material.", type: "error" });
    }
  };

  const handleBulkDuplicate = async () => {
    try {
      const selectedMaterials = materials.filter(m => selectedIds.has(m.id));
      for (const material of selectedMaterials) {
        const duplicatedMaterial = {
          name: `${material.name} (Copy)`,
          type: material.type,
          vendor: material.vendor || "",
          costPerUnit: material.costPerUnit,
          quantityInStock: material.quantityInStock,
          minStockLevel: material.minStockLevel || 0,
          unit: material.unit,
          piecesPerBag: material.piecesPerBag || 1,
        };
        await api.addMaterial(duplicatedMaterial);
      }
      setSelectedIds(new Set());
      fetchMaterials();
      setNotification({ message: `Duplicated ${selectedMaterials.length} materials successfully!`, type: "success" });
    } catch (error) {
      console.error("Error bulk duplicating materials:", error);
      setNotification({ message: "Failed to duplicate some materials.", type: "error" });
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const formattedData = data.map(row => ({
          name: row.name || row.Name,
          type: row.type || row.Type || "Other",
          vendor: row.vendor || row.Vendor || "Unknown",
          costPerUnit: parseFloat(row.costPerUnit || row.Cost || row.Price || "0"),
          quantityInStock: parseFloat(row.quantityInStock || row.Quantity || row.Stock || "0"),
          minStockLevel: parseFloat(row.minStockLevel || row.MinStock || "5"),
          unit: row.unit || row.Unit || "2",
          piecesPerBag: parseInt(row.piecesPerBag || row.Pieces || "1")
        })).filter(m => m.name);

        if (formattedData.length > 0) {
          try {
            const stats = await api.bulkMaterialsImport(formattedData);
            fetchMaterials();
            setNotification({
              message: `Import complete!\n\nMaterials: ${stats.importedCount} new, ${stats.updatedCount} updated.`,
              type: 'success'
            });
          } catch (err) {
            setNotification({
              message: "Failed to import materials. Please check CSV format.",
              type: 'error'
            });
          }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const downloadTemplate = () => {
    const template = "name,type,vendor,costPerUnit,quantityInStock,minStockLevel,unit,piecesPerBag\nSoy Wax,Wax,CandleScience,0.15,100,20,16,1\nCotton Wick,Wicks,The Flaming Candle,0.05,50,10,Piece Bag,100";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materials_template.csv";
    a.click();
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await api.cleanupDuplicates() as any;
      setCleanupResult({ 
        deletedCount: result.totalDeleted, 
        updatedProductsCount: result.deletedProducts // Reusing field for simplicity in this specific UI
      });
      fetchMaterials();
    } catch (error) {
      console.error("Cleanup error:", error);
      setNotification({ message: "Failed to cleanup duplicates.", type: 'error' });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleBackup = async () => {
    try {
      const [materialsList, vendorsList, productsList] = await Promise.all([
        api.getMaterials(showAllData),
        api.getVendors(showAllData),
        api.getProducts(showAllData)
      ]);

      const backupData = JSON.stringify({
        materials: materialsList,
        vendors: vendorsList,
        products: productsList,
        exportDate: new Date().toISOString(),
        version: "1.1"
      }, null, 2);

      const blob = new Blob([backupData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `costing_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Backup error:", error);
      setNotification({ message: "Failed to create backup.", type: 'error' });
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let data = JSON.parse(content);
        
        // Handle different JSON structures
        let materialsArray: any[] = [];
        let vendorsArray: any[] = [];
        let productsArray: any[] = [];

        if (Array.isArray(data)) {
          materialsArray = data;
        } else if (data && typeof data === 'object') {
          // Flatten structure if nesting exists (e.g. { data: { materials: [...] } })
          const source = (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : data;

          if (Array.isArray(source.materials)) {
            materialsArray = source.materials;
          } else if (Array.isArray(data.data)) {
            materialsArray = data.data;
          }

          if (Array.isArray(source.vendors)) {
            vendorsArray = source.vendors;
          }

          if (Array.isArray(source.products)) {
            productsArray = source.products;
          }
        } else {
          throw new Error("Invalid backup format. Expected a JSON array or object.");
        }

        if (materialsArray.length === 0 && vendorsArray.length === 0 && productsArray.length === 0) {
          setNotification({ message: "The backup file contains no data to restore.", type: 'error' });
          return;
        }

        let materialStats = { importedCount: 0, updatedCount: 0 };
        let vendorStats = { importedCount: 0, updatedCount: 0 };
        let productStats = { importedCount: 0, updatedCount: 0 };

        // 1. Restore Materials
        if (materialsArray.length > 0) {
          const formattedMaterials = materialsArray.map(m => ({
            id: m.id,
            name: m.name || m.Name || "",
            type: m.type || m.Type || "Other",
            vendor: m.vendor || m.Vendor || "Unknown",
            costPerUnit: parseFloat(String(m.costPerUnit ?? m.Cost ?? m.Price ?? m.cost_per_unit ?? "0")),
            quantityInStock: parseFloat(String(m.quantityInStock ?? m.Quantity ?? m.Stock ?? m.quantity ?? m.stock ?? m.quantity_in_stock ?? "0")),
            minStockLevel: parseFloat(String(m.minStockLevel ?? m.MinStock ?? m.min_stock ?? m.min_stock_level ?? "5")),
            unit: String(m.unit || m.Unit || "2"),
            piecesPerBag: parseInt(String(m.piecesPerBag ?? m.Pieces ?? m.pieces ?? "1"))
          })).filter(m => m.name);

          if (formattedMaterials.length > 0) {
            materialStats = await api.bulkMaterialsImport(formattedMaterials);
          }
        }

        // 2. Restore Vendors
        if (vendorsArray.length > 0) {
          const formattedVendors = vendorsArray.map((v: any) => ({
            id: v.id,
            name: v.name || v.Name,
            address: v.address || v.Address || null,
            website: v.website || v.Website || null
          })).filter((v: any) => v.name);
          
          if (formattedVendors.length > 0) {
            vendorStats = await api.bulkVendorsImport(formattedVendors);
          }
        }

        // 3. Restore Products
        if (productsArray.length > 0) {
          const formattedProducts = productsArray.map((p: any) => ({
            id: p.id,
            name: p.name || p.Name,
            description: p.description || p.Description || "",
            materials: p.materials || [],
            laborCost: parseFloat(String(p.laborCost ?? 0)),
            overheadCost: parseFloat(String(p.overheadCost ?? 0)),
            markup: parseFloat(String(p.markup ?? 0)),
            totalCost: parseFloat(String(p.totalCost ?? 0)),
            suggestedPrice: parseFloat(String(p.suggestedPrice ?? 0)),
            actualPrice: parseFloat(String(p.actualPrice ?? 0)),
            profit: parseFloat(String(p.profit ?? 0)),
            profitMargin: parseFloat(String(p.profitMargin ?? 0)),
            listingCopy: p.listingCopy || null
          })).filter((p: any) => p.name);

          if (formattedProducts.length > 0) {
            productStats = await api.bulkProductsImport(formattedProducts);
          }
        }

        fetchMaterials();
        setNotification({
          message: `Restore complete!\n\nMaterials: ${materialStats.importedCount} new, ${materialStats.updatedCount} updated.\nVendors: ${vendorStats.importedCount} new, ${vendorStats.updatedCount} updated.\nProducts: ${productStats.importedCount} new, ${productStats.updatedCount} updated.`,
          type: 'success'
        });
      } catch (err) {
        console.error("Restore error:", err);
        setNotification({
          message: err instanceof Error ? err.message : "Failed to restore backup. Please check the JSON file format.",
          type: 'error'
        });
      }
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleSort = (column: keyof Material | 'totalValue') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedMaterials.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMaterials.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleExportSelected = () => {
    if (selectedIds.size === 0) {
      setNotification({ message: "Please select at least one material to export.", type: 'error' });
      return;
    }

    const selectedMaterials = materials.filter(m => selectedIds.has(m.id));
    const csvData = selectedMaterials.map(m => ({
      Name: m.name,
      Type: m.type,
      Vendor: m.vendor,
      "Cost Per Unit": m.costPerUnit,
      "Quantity In Stock": m.quantityInStock,
      "Min Stock Level": m.minStockLevel,
      Unit: m.unit,
      "Pieces Per Bag": m.piecesPerBag || 1,
      "Total Value": (m.costPerUnit * m.quantityInStock).toFixed(2)
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `materials_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setNotification({ message: `Successfully exported ${selectedIds.size} materials!`, type: 'success' });
  };

  const sortedMaterials = [...materials]
    .filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || m.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // Primary sort by category order if sorting by type
      if (sortColumn === 'type') {
        const indexA = types.indexOf(a.type);
        const indexB = types.indexOf(b.type);
        const orderA = indexA !== -1 ? indexA : 999;
        const orderB = indexB !== -1 ? indexB : 999;
        
        if (orderA !== orderB) {
          return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
        }
        // If same category, always sort by name ascending as secondary
        return a.name.localeCompare(b.name);
      }

      // Default sorting for other columns
      let valA: any = a[sortColumn as keyof Material];
      let valB: any = b[sortColumn as keyof Material];

      if (sortColumn === 'totalValue') {
        valA = a.costPerUnit * a.quantityInStock;
        valB = b.costPerUnit * b.quantityInStock;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      
      // Secondary sort by name
      return a.name.localeCompare(b.name);
    });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;

  const SortIcon = ({ column }: { column: keyof Material | 'totalValue' }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {filterType ? `${filterType} Inventory` : "Material Inventory"}
          </h1>
          <p className="text-zinc-500 text-sm">
            {filterType ? `Managing your ${filterType.toLowerCase()} stock and costs.` : "Manage your raw materials and their costs."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCsvImport}
            className="hidden"
          />
          <input
            type="file"
            accept=".json"
            ref={jsonFileInputRef}
            onChange={handleRestore}
            className="hidden"
          />
          <Link
            to="/vendors"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            <Store className="w-4 h-4" />
            Vendors
          </Link>
          <button
            onClick={() => {
              console.log("Cleanup button clicked, showing modal...");
              setShowCleanupModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
            title="Remove redundant material entries"
          >
            <Sparkles className="w-4 h-4" />
            Cleanup
          </button>
          <button
            onClick={handleBackup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
            title="Backup materials to JSON"
          >
            <Database className="w-4 h-4" />
            Backup
          </button>
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
            title="Restore materials from JSON"
          >
            <Upload className="w-4 h-4" />
            Restore
          </button>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium"
          >
            <FileUp className="w-4 h-4" />
            Import CSV
          </button>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkDuplicate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium animate-in zoom-in-95 duration-200 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Duplicate Selected ({selectedIds.size})
              </button>
              <button
                onClick={handleExportSelected}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium animate-in zoom-in-95 duration-200"
              >
                <Download className="w-4 h-4" />
                Export ({selectedIds.size})
              </button>
            </>
          )}
          <button
            onClick={() => {
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        </div>
      </div>


      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <div className="bg-white p-4 border border-zinc-200 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">
              {filterType ? `${filterType} Items` : "Total Items"}
            </p>
            <p className="text-xl font-bold text-zinc-900">{sortedMaterials.length}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Overlay */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                {editingId ? "Edit Material" : "Add New Material"}
              </h2>
              <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Material Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Soy Wax, Cotton Wick"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Material Type</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setType(newType);
                    if (newType === "Wicks") {
                      setUnit("Piece Bag");
                    } else if (newType === "Wax") {
                      setUnit("5 lbs");
                    } else if (newType === "Fragrance" || newType === "Vessels" || newType === "Diffuser Bottles" || newType === "Diffuser Base") {
                      setUnit("8");
                      if (newType === "Fragrance" || newType === "Diffuser Base") setMinStockLevel("1");
                    } else {
                      setUnit("8");
                    }
                  }}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                >
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {type === "Other" && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium text-zinc-700">Custom Type</label>
                  <input
                    required
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Enter custom material type"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Vendor</label>
                <input
                  type="text"
                  list="vendor-list"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. CandleScience"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
                <datalist id="vendor-list">
                  {vendors.map(v => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Cost per Unit</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={costPerUnit}
                      onChange={(e) => setCostPerUnit(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">
                    {type === "Wicks" ? "Unit Type" : "Unit in Ounces"}
                  </label>
                  <select
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  >
                    {type === "Wicks" ? (
                      <>
                        {DEFAULT_WICK_UNITS.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                        <option value="Other">Other...</option>
                      </>
                    ) : type === "Wax" ? (
                      <>
                        {waxUnits.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                        <option value="Other">Other...</option>
                      </>
                    ) : (
                      <>
                        {DEFAULT_OZ_UNITS.map(val => (
                          <option key={val} value={val}>{val} oz</option>
                        ))}
                        <option value="Other">Other...</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              {unit === "Other" && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium text-zinc-700">Custom Unit</label>
                  <input
                    required
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder={type === "Wax" ? "e.g. 50 lbs Case" : "e.g. 9 oz Jar"}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              )}
              {type === "Wicks" && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium text-zinc-700">Pieces per Bag</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={piecesPerBag}
                    onChange={(e) => setPiecesPerBag(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Quantity in Stock</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={quantityInStock}
                      onChange={(e) => setQuantityInStock(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">
                    {type === "Fragrance" ? "Min Stock Level in oz's" : "Min Stock Level"}
                  </label>
                  <div className="relative">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      const mat = materials.find(m => m.id === editingId);
                      if (mat) {
                        handleDuplicate(mat);
                        resetForm();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 font-medium rounded-lg hover:bg-zinc-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-zinc-500" />
                    Duplicate
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Materials List */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={sortedMaterials.length > 0 && selectedIds.size === sortedMaterials.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Material <SortIcon column="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type <SortIcon column="type" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('vendor')}
                >
                  <div className="flex items-center gap-1">
                    Vendor <SortIcon column="vendor" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('costPerUnit')}
                >
                  <div className="flex items-center gap-1">
                    Cost/Unit <SortIcon column="costPerUnit" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('quantityInStock')}
                >
                  <div className="flex items-center gap-1">
                    Stock <SortIcon column="quantityInStock" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => handleSort('totalValue')}
                >
                  <div className="flex items-center gap-1">
                    Total Value <SortIcon column="totalValue" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedMaterials.length > 0 ? (
                sortedMaterials.map((material) => (
                  <tr key={material.id} className={cn("hover:bg-zinc-50 transition-colors", selectedIds.has(material.id) && "bg-zinc-50")}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(material.id)}
                        onChange={() => toggleSelect(material.id)}
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-zinc-900">{material.name}</p>
                      <p className="text-xs text-zinc-500">
                        per {material.unit}
                        {material.type === "Wicks" && material.piecesPerBag && material.piecesPerBag > 1 && (
                          <span className="ml-1 text-zinc-400">({material.piecesPerBag} pcs)</span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-medium">
                        {material.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {material.vendor || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      ${material.costPerUnit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const unitSize = getMaterialBaseUnitSize(material);
                        const totalStock = material.quantityInStock * unitSize;
                        
                        let fallbackMin = material.type === "Fragrance" ? 1 : 5;
                        let currentMin = material.minStockLevel || fallbackMin;
                        
                        // If it's a fragrance and the min is still the old default of 5, 
                        // treat it as 1 to avoid alerts at 2oz, 3oz, etc.
                        if (material.type === "Fragrance" && currentMin === 5) {
                          currentMin = 1;
                        }
                        
                        const isLow = totalStock <= currentMin;
                        
                        return (
                          <>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              isLow ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                            )}>
                              {material.quantityInStock} {material.unit}
                            </span>
                            {isLow && (
                              <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter">Low Stock</p>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      ${(material.costPerUnit * material.quantityInStock).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setShowAdjustModal(material);
                            setAdjustAmount("");
                            setAdjustNote("");
                          }}
                          className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Adjust Stock"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowHistoryId(material.id);
                            fetchHistory(material.id);
                          }}
                          className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Stock History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(material)}
                          className="p-2 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Duplicate Material"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(material.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No materials found. Add your first material to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-[70] animate-in slide-in-from-bottom-4 duration-300">
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
            notification.type === 'success' ? "bg-white border-green-100 text-green-800" : "bg-white border-red-100 text-red-800"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              notification.type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
              {notification.type === 'success' ? <Save className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium whitespace-pre-line">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6">
            {!cleanupResult ? (
              <>
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Cleanup Inventory?</h3>
                  <p className="text-sm text-zinc-500">
                    This will find and remove redundant material entries (same name, type, and vendor). 
                    It will safely update any products that use the duplicate IDs.
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
                      <span className="text-zinc-500">Redundant materials removed:</span>
                      <span className="font-bold text-zinc-900">{cleanupResult.deletedCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Product references updated:</span>
                      <span className="font-bold text-zinc-900">{cleanupResult.updatedProductsCount}</span>
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Delete Material?</h3>
              <p className="text-sm text-zinc-500">Are you sure you want to delete this material? This action cannot be undone.</p>
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
      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">Adjust Stock</h3>
              <button onClick={() => setShowAdjustModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <p className="text-sm text-zinc-500 mb-2">
                  Current: <span className="font-bold text-zinc-900">{showAdjustModal.quantityInStock} {showAdjustModal.unit}</span>
                </p>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Change Amount (+/-)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 5 or -2"
                  className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Restock or Spillage"
                  className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isAdjusting}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {isAdjusting ? "Updating..." : "Update Stock"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-zinc-900">Stock History</h3>
              <button onClick={() => setShowHistoryId(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div>
                </div>
              ) : historyLogs.length > 0 ? (
                <div className="space-y-4">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        log.change > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {log.change > 0 ? <Plus className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-zinc-900">
                            {log.change > 0 ? "+" : ""}{log.change}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {log.createdAt?.toDate ? format(log.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-500 capitalize">{log.type}</p>
                        {log.note && <p className="text-xs text-zinc-400 mt-1 italic">"{log.note}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  No history logs found for this material.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
