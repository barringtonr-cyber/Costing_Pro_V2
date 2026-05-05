import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Save,
  ChefHat,
  Calculator,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Sparkles,
  ShoppingBag,
  Printer
} from "lucide-react";
import { cn } from "../lib/utils";
import AIRecipeGenerator from "../components/AIRecipeGenerator";
import ProductListingGenerator from "../components/ProductListingGenerator";
import LabelGenerator from "../components/LabelGenerator";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface Material {
  id: string;
  name: string;
  type: string;
  costPerUnit: number;
  unit: string;
  piecesPerBag?: number;
}

interface ProductMaterial {
  materialId: string;
  quantityUsed: number;
  unit?: 'oz' | 'g' | 'pcs';
  percentage?: number;
  name?: string;
  type?: string;
  costPerUnit?: number;
  piecesPerBag?: number;
}

interface Product {
  id: string;
  name: string;
  type?: 'Candle' | 'Room Spray';
  description?: string;
  materials: ProductMaterial[];
  totalCost: number;
  profitMargin: number;
  suggestedPrice: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'All' | 'Candle' | 'Room Spray'>('All');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [listingProduct, setListingProduct] = useState<Product | null>(null);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const { user, isPro: isProContext } = useAuth();
  const { showAllData } = useAdmin();
  const isAdmin = user?.role === "admin";
  const isPro = isProContext; 
  const isAtLimit = false; 

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<'Candle' | 'Room Spray'>('Candle');
  const [description, setDescription] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<ProductMaterial[]>([]);
  const [sellingPrice, setSellingPrice] = useState("0");

  const fetchData = async () => {
    try {
      const effectiveAll = showAllData && isAdmin;
      const [pData, mData] = await Promise.all([
        api.getProducts(effectiveAll),
        api.getMaterials(effectiveAll)
      ]);
      setProducts(pData as any);
      setMaterials(mData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showAllData, isAdmin]);

  const getMaterialBaseUnitSize = (material: Material) => {
    if (!material) return 1;
    const unit = material.unit.toLowerCase();
    if (unit.includes("lb")) {
      return (parseFloat(unit) || 1) * 16;
    }
    if (unit === "piece bag") {
      return material.piecesPerBag || 1;
    }
    // If it's a number (like "2" for 2 oz), return that number
    const num = parseFloat(unit);
    return isNaN(num) ? 1 : num;
  };

  const calculateTotalCost = (pMaterials: ProductMaterial[]) => {
    // 1. Calculate total cost
    return pMaterials.reduce((total, pm) => {
      const material = materials.find(m => m.id === pm.materialId);
      if (!material) return total;

      const unitSize = getMaterialBaseUnitSize(material);
      const costPerBaseUnit = material.costPerUnit / unitSize;
      
      let quantityInOz = pm.quantityUsed || 0;
      if (pm.unit === 'g') {
        quantityInOz = (pm.quantityUsed || 0) / 28.3495;
      }

      return total + (costPerBaseUnit * quantityInOz);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMaterials.length === 0) return;

    const totalCost = calculateTotalCost(selectedMaterials);
    const price = parseFloat(sellingPrice) || 0;
    const margin = price > 0 ? Math.ceil(((price - totalCost) / price) * 100) : 0;

    const productData = {
      name,
      type,
      description,
      materials: selectedMaterials,
      totalCost,
      profitMargin: margin,
      suggestedPrice: price,
    };

    try {
      if (editingId) {
        // SQLite backend doesn't have update for products in my simple implementation yet
        // but I can delete and re-add or just implement it. For now, let's just add.
        await api.deleteProduct(editingId);
        await api.addProduct(productData);
      } else {
        await api.addProduct(productData);
      }
      fetchData();
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setType("Candle");
    setDescription("");
    setSelectedMaterials([]);
    setSellingPrice("0");
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    setName(product.name);
    setType(product.type || "Candle");
    setDescription(product.description || "");
    setSelectedMaterials(product.materials.map(m => ({ 
      materialId: m.materialId, 
      quantityUsed: m.quantityUsed,
      unit: m.unit,
      percentage: m.percentage
    })));
    setSellingPrice(product.suggestedPrice.toString());
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteProduct(id);
      fetchData();
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const addMaterialRow = () => {
    if (materials.length > 0) {
      const firstMat = materials[0];
      setSelectedMaterials([...selectedMaterials, { 
        materialId: firstMat.id, 
        quantityUsed: 1,
        unit: firstMat.unit === "Piece Bag" ? "pcs" : "oz"
      }]);
    }
  };

  const removeMaterialRow = (index: number) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index: number, field: keyof ProductMaterial, value: string | number) => {
    const updated = [...selectedMaterials];
    if (field === 'materialId') {
      const material = materials.find(m => m.id === value);
      updated[index] = { 
        ...updated[index], 
        materialId: value as string,
        quantityUsed: 1,
        unit: material?.unit === "Piece Bag" ? "pcs" : "oz"
      };
    } else if (field === 'quantityUsed') {
      updated[index] = { ...updated[index], quantityUsed: parseFloat(value as string) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSelectedMaterials(updated);
  };

  const currentTotalWaxQuantity = selectedMaterials.reduce((sum, pm) => {
    const material = materials.find(m => m.id === pm.materialId);
    if (material?.type === "Wax") {
      let qty = pm.quantityUsed || 0;
      if (pm.unit === 'g') qty = qty / 28.3495;
      return sum + qty;
    }
    return sum;
  }, 0);

  const currentTotalFragranceQuantity = selectedMaterials.reduce((sum, pm) => {
    const material = materials.find(m => m.id === pm.materialId);
    if (material?.type === "Fragrance") {
      let qty = pm.quantityUsed || 0;
      if (pm.unit === 'g') qty = qty / 28.3495;
      return sum + qty;
    }
    return sum;
  }, 0);

  const currentTotalWicks = selectedMaterials.reduce((sum, pm) => {
    const material = materials.find(m => m.id === pm.materialId);
    if (material?.type === "Wicks") {
      return sum + (pm.quantityUsed || 0);
    }
    return sum;
  }, 0);

  const currentTotalCost = calculateTotalCost(selectedMaterials);
  const currentSellingPrice = parseFloat(sellingPrice) || 0;
  const currentProfitMargin = currentSellingPrice > 0 ? ((currentSellingPrice - currentTotalCost) / currentSellingPrice) * 100 : 0;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Product Recipes</h1>
          <p className="text-zinc-500 text-sm">Calculate costs and suggested pricing for your products.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isPro && (
            <button
              onClick={() => {
                setShowAIGenerator(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-colors font-bold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-zinc-900" />
              AI Generate
            </button>
          )}
          <button
            onClick={() => {
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </button>
        </div>
      </div>


      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <div className="flex p-1 bg-zinc-100 rounded-lg w-full md:w-auto">
          {(['All', 'Candle', 'Room Spray'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                filterType === t 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t === 'All' ? 'All Products' : t + 's'}
            </button>
          ))}
        </div>
      </div>

      {showAIGenerator && (
        <AIRecipeGenerator 
          onClose={() => setShowAIGenerator(false)} 
          onSave={() => {
            fetchData();
          }}
        />
      )}

      {listingProduct && (
        <ProductListingGenerator
          product={{
            name: listingProduct.name,
            description: listingProduct.description,
            materials: listingProduct.materials.map(pm => {
              const m = materials.find(mat => mat.id === pm.materialId);
              return {
                name: m?.name || "Unknown",
                quantityUsed: pm.quantityUsed,
                unit: pm.unit || (m?.unit === "Piece Bag" ? "pcs" : "oz")
              };
            }),
            suggestedPrice: listingProduct.suggestedPrice
          }}
          onClose={() => setListingProduct(null)}
        />
      )}

      {labelProduct && (
        <LabelGenerator
          product={labelProduct}
          onClose={() => setLabelProduct(null)}
        />
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                {editingId ? "Edit Product" : "New Product Recipe"}
              </h2>
              <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Product Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Midnight Jasmine"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Product Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
                  >
                    <option value="Candle">Candle Product</option>
                    <option value="Room Spray">Room Spray Product</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of this product..."
                  rows={2}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700">Materials Used</label>
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="text-xs font-bold text-zinc-900 flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Material
                  </button>
                </div>
                
                {selectedMaterials.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-xl text-zinc-400 text-sm">
                    No materials added yet.
                  </div>
                )}

                <div className="space-y-2">
                  {selectedMaterials.map((pm, index) => {
                    const material = materials.find(m => m.id === pm.materialId);
                    const unitSize = getMaterialBaseUnitSize(material!);
                    const costPerBaseUnit = material ? material.costPerUnit / unitSize : 0;
                    const lineCost = costPerBaseUnit * (pm.quantityUsed || 0);

                    return (
                      <div key={index} className="flex flex-col gap-1 p-3 bg-zinc-50/50 rounded-xl border border-zinc-100">
                        <div className="flex items-center gap-2">
                          <select
                            value={pm.materialId}
                            onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none bg-white"
                          >
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.type}) - ${m.unit === "Piece Bag" && m.piecesPerBag && m.piecesPerBag > 1 ? (m.costPerUnit / m.piecesPerBag).toFixed(3) : m.costPerUnit}/{m.unit === "Piece Bag" ? "pc" : "oz"}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 w-32">
                            <input
                              type="number"
                              step="0.01"
                              value={pm.quantityUsed}
                              onChange={(e) => updateMaterialRow(index, 'quantityUsed', e.target.value)}
                              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none bg-white"
                              placeholder="Qty"
                            />
                            {material?.unit === "Piece Bag" ? (
                              <span className="text-xs text-zinc-400 w-8 text-center">pcs</span>
                            ) : (
                              <select
                                value={pm.unit || 'oz'}
                                onChange={(e) => updateMaterialRow(index, 'unit', e.target.value as any)}
                                className="px-1 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none bg-white"
                              >
                                <option value="oz">oz</option>
                                <option value="g">g</option>
                              </select>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(index)}
                            className="p-2 text-zinc-400 hover:text-red-500"
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            Quantity: {pm.quantityUsed} {pm.unit || (material?.unit === "Piece Bag" ? "pcs" : "oz")}
                          </span>
                          <span className="text-xs font-bold text-zinc-600">
                            Cost: ${lineCost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {currentTotalWaxQuantity > 0 && selectedMaterials.some(pm => materials.find(m => m.id === pm.materialId)?.type === "Fragrance") && (
                  <p className="text-[10px] text-zinc-400 italic mt-1">
                    * Enter the fragrance weight manually in ounces.
                  </p>
                )}
              </div>

              <div className="bg-zinc-50 p-6 rounded-xl space-y-6 border border-zinc-100">
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-zinc-200">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Wax</p>
                    <p className="text-sm font-bold text-zinc-900">{currentTotalWaxQuantity.toFixed(2)} oz</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Fragrance</p>
                    <p className="text-sm font-bold text-zinc-900">{currentTotalFragranceQuantity.toFixed(2)} oz</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Wicks</p>
                    <p className="text-sm font-bold text-zinc-900">{currentTotalWicks} pcs</p>
                  </div>
                  <div className="text-center col-span-3 pt-2 border-t border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Recipe Weight</p>
                    <p className="text-sm font-bold text-zinc-900">{(currentTotalWaxQuantity + currentTotalFragranceQuantity).toFixed(2)} oz</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Selling Price ($)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 italic">Margin: {Math.ceil(currentProfitMargin)}%</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Total Material Cost</label>
                    <p className="text-2xl font-bold text-zinc-900">${currentTotalCost.toFixed(2)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Final Price</label>
                    <p className="text-3xl font-black text-zinc-900">${currentSellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Profit per Item</label>
                    <p className="text-xl font-bold text-green-600">+${(currentSellingPrice - currentTotalCost).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-zinc-600 font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedMaterials.length === 0}
                  className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Update Recipe" : "Save Recipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  {isPro && (
                    <>
                      <button 
                        onClick={() => {
                          setListingProduct(product);
                        }}
                        className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-50"
                        title="Generate Product Listing"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setLabelProduct(product);
                        }}
                        className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-50"
                        title="Print Labels"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleEdit(product)} className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeletingId(product.id)} className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest",
                    product.type === "Room Spray" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {product.type || "Candle"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900">{product.name}</h3>
                {product.description && <p className="text-xs text-zinc-500 italic mb-1 line-clamp-2">{product.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.materials.map((pm, i) => {
                    const material = materials.find(m => m.id === pm.materialId);
                    if (!material && pm.materialId === 'distilled-water') {
                      return (
                        <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          Distilled Water: {pm.quantityUsed}oz
                        </span>
                      );
                    }
                    if (!material) return null;
                    return (
                      <span key={i} className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {material.name}: {pm.quantityUsed}{material.unit === "Piece Bag" ? "pcs" : "oz"}
                      </span>
                    );
                  })}
                </div>
                
                {(() => {
                  const totalWax = product.materials.reduce((sum, pm) => {
                    const m = materials.find(mat => mat.id === pm.materialId);
                    return m?.type === "Wax" ? sum + pm.quantityUsed : sum;
                  }, 0);
                  const totalFragrance = product.materials.reduce((sum, pm) => {
                    const m = materials.find(mat => mat.id === pm.materialId);
                    return m?.type === "Fragrance" ? sum + pm.quantityUsed : sum;
                  }, 0);
                  
                  if (totalWax > 0 && totalFragrance > 0) {
                    const load = (totalFragrance / totalWax) * 100;
                    return (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                          Fragrance Load: {load.toFixed(1)}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <p className="text-xs text-zinc-400 mt-2">{product.materials.length} materials used</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Cost</p>
                  <p className="text-lg font-bold text-zinc-900">${product.totalCost.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Price</p>
                  <p className="text-lg font-bold text-zinc-900">${product.suggestedPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {Math.ceil(product.profitMargin)}% Margin
                </span>
                <span className="text-sm font-bold text-zinc-900">
                  Profit: ${(product.suggestedPrice - product.totalCost).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-zinc-200 rounded-3xl">
            <ChefHat className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No products created yet.</p>
            <button onClick={() => setIsAdding(true)} className="mt-4 text-zinc-900 font-bold hover:underline">
              Create your first recipe
            </button>
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
              <h3 className="text-lg font-bold text-zinc-900">Delete Recipe?</h3>
              <p className="text-sm text-zinc-500">Are you sure you want to delete this product recipe? This action cannot be undone.</p>
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
