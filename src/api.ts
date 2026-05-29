import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "./firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLLECTIONS = {
  MATERIALS: 'materials',
  PRODUCTS: 'products',
  SALES: 'sales',
  VENDORS: 'vendors',
  STOCK_LOGS: 'stock_logs',
  USERS: 'users'
};

const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if ('_methodName' in data) return data; // Keep serverTimestamp markers or other Firebase literals if any
  
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v)).filter(v => v !== undefined);
  }

  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    // Managed fields handled by API wrapper
    if (['id', 'createdAt', 'updatedAt'].includes(key)) return;
    
    const value = data[key];
    if (value !== undefined) {
      const sanitizedValue = sanitizeData(value);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
  });
  return sanitized;
};

const getMaterialBaseUnitSize = (material: any) => {
  if (!material || !material.unit) return 1;
  const unit = material.unit.toLowerCase();
  if (unit.includes("lb")) {
    return (parseFloat(unit) || 1) * 16;
  }
  if (unit === "piece bag") {
    return material.piecesPerBag || 1;
  }
  const num = parseFloat(unit);
  return isNaN(num) ? 1 : num;
};

// API Service for Firebase integration
export const api = {
  // Materials
  getMaterials: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all
        ? query(collection(db, COLLECTIONS.MATERIALS), orderBy("name"))
        : query(
            collection(db, COLLECTIONS.MATERIALS),
            where("userId", "==", auth.currentUser?.uid),
            orderBy("name")
          );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.MATERIALS);
      return [];
    }
  },

  addMaterial: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const payload = {
        ...sanitizeData(data),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.MATERIALS), payload);
      
      // Auto-add vendor if it doesn't exist
      if (data.vendor) {
        const vendorQ = query(
          collection(db, COLLECTIONS.VENDORS),
          where("userId", "==", auth.currentUser.uid),
          where("name", "==", data.vendor)
        );
        const vendorSnap = await getDocs(vendorQ);
        if (vendorSnap.empty) {
          await addDoc(collection(db, COLLECTIONS.VENDORS), {
            name: data.vendor,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });
        }
      }
      
      return { id: docRef.id };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, COLLECTIONS.MATERIALS);
    }
  },

  updateMaterial: async (id: string, data: any) => {
    try {
      const docRef = doc(db, COLLECTIONS.MATERIALS, id);
      const payload = {
        ...sanitizeData(data),
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.MATERIALS}/${id}`);
    }
  },

  deleteMaterial: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.MATERIALS, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.MATERIALS}/${id}`);
    }
  },

  getMaterialTypes: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all 
        ? query(collection(db, COLLECTIONS.MATERIALS))
        : query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      const types = new Set<string>();
      snapshot.docs.forEach(doc => {
        const type = doc.data().type;
        if (type) types.add(type);
      });
      return Array.from(types);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.MATERIALS);
      return [];
    }
  },

  getMaterialUnits: async (type: string, all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all 
        ? query(collection(db, COLLECTIONS.MATERIALS), where("type", "==", type))
        : query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", auth.currentUser?.uid), where("type", "==", type));
      const snapshot = await getDocs(q);
      const units = new Set<string>();
      snapshot.docs.forEach(doc => {
        const unit = doc.data().unit;
        if (unit) units.add(unit);
      });
      return Array.from(units);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.MATERIALS);
      return [];
    }
  },

  // Products
  getProducts: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all
        ? query(collection(db, COLLECTIONS.PRODUCTS), orderBy("name"))
        : query(
            collection(db, COLLECTIONS.PRODUCTS),
            where("userId", "==", auth.currentUser?.uid),
            orderBy("name")
          );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.PRODUCTS);
      return [];
    }
  },

  addProduct: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const payload = {
        ...sanitizeData(data),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), payload);
      return { id: docRef.id };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, COLLECTIONS.PRODUCTS);
    }
  },

  updateProduct: async (id: string, data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
      const payload = {
        ...sanitizeData(data),
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.PRODUCTS}/${id}`);
    }
  },

  produceProductBatch: async (productId: string, quantity: number, deductMaterials: boolean) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      
      const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) throw new Error("Product not found");
      const product = productSnap.data();

      // 1. Deduct Materials if requested
      if (deductMaterials && product.materials) {
        for (const item of product.materials) {
          const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
          const materialSnap = await getDoc(materialRef);
          if (materialSnap.exists()) {
            const material = materialSnap.data();
            let quantityUsedInBaseUnit = (item.quantityUsed || 0) * quantity;
            if (item.unit === 'g') {
              quantityUsedInBaseUnit = quantityUsedInBaseUnit / 28.3495;
            }
            const newStock = (material.quantityInStock || 0) - quantityUsedInBaseUnit;
            
            batch.update(materialRef, { 
              quantityInStock: newStock,
              updatedAt: serverTimestamp()
            });

            // Log material stock change
            const logRef = doc(collection(db, COLLECTIONS.STOCK_LOGS));
            batch.set(logRef, {
              materialId: item.materialId,
              change: -quantityUsedInBaseUnit,
              type: 'manufacture',
              note: `Manufactured ${quantity} x ${product.name}`,
              userId: auth.currentUser.uid,
              createdAt: serverTimestamp()
            });
          }
        }
      }

      // 2. Increase product stock
      const newProductStock = (product.quantityInStock || 0) + quantity;
      batch.update(productRef, {
        quantityInStock: newProductStock,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "manufacture-transaction");
    }
  },

  deleteProduct: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.PRODUCTS}/${id}`);
    }
  },

  // Sales
  getSales: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all
        ? query(collection(db, COLLECTIONS.SALES), orderBy("createdAt", "desc"))
        : query(
            collection(db, COLLECTIONS.SALES),
            where("userId", "==", auth.currentUser?.uid),
            orderBy("createdAt", "desc")
          );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.SALES);
      return [];
    }
  },

  addSale: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      
      // Get the product to find materials
      const productRef = doc(db, COLLECTIONS.PRODUCTS, data.productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) throw new Error("Product not found");
      const product = productSnap.data();

      if (data.fulfillFromStock) {
        // Fulfill from pre-made product stock (Deduct from Product stock level)
        const currentStock = product.quantityInStock || 0;
        batch.update(productRef, {
          quantityInStock: currentStock - (data.quantitySold || 1),
          updatedAt: serverTimestamp()
        });
      } else {
        // Made to order (Deduct from raw materials stock directly)
        if (product.materials) {
          for (const item of product.materials) {
            const materialRef = doc(db, COLLECTIONS.MATERIALS, item.materialId);
            const materialSnap = await getDoc(materialRef);
            if (materialSnap.exists()) {
              const material = materialSnap.data();
              const quantityUsed = (item.quantityUsed || 0) * (data.quantitySold || 1);
              const newStock = (material.quantityInStock || 0) - quantityUsed;
              
              batch.update(materialRef, { 
                quantityInStock: newStock,
                updatedAt: serverTimestamp()
              });

              // Log stock change
              const logRef = doc(collection(db, COLLECTIONS.STOCK_LOGS));
              batch.set(logRef, {
                materialId: item.materialId,
                change: -quantityUsed,
                type: 'sale',
                note: `Sale of ${data.quantitySold} x ${data.productName}`,
                userId: auth.currentUser.uid,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      }

      // Add the sale
      const saleRef = doc(collection(db, COLLECTIONS.SALES));
      batch.set(saleRef, {
        ...sanitizeData(data),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      return { id: saleRef.id };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "sale-transaction");
    }
  },

  // Vendors
  getVendors: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      const q = all
        ? query(collection(db, COLLECTIONS.VENDORS), orderBy("name"))
        : query(
            collection(db, COLLECTIONS.VENDORS),
            where("userId", "==", auth.currentUser?.uid),
            orderBy("name")
          );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.VENDORS);
      return [];
    }
  },

  addVendor: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const payload = {
        ...sanitizeData(data),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.VENDORS), payload);
      return { id: docRef.id };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, COLLECTIONS.VENDORS);
    }
  },

  updateVendor: async (id: string, data: any) => {
    try {
      const docRef = doc(db, COLLECTIONS.VENDORS, id);
      const payload = {
        ...sanitizeData(data),
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.VENDORS}/${id}`);
    }
  },

  deleteVendor: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.VENDORS, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.VENDORS}/${id}`);
    }
  },

  // Customers
  getCustomers: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return [];
    try {
      // In this app, customers are extracted from Sales
      const q = all
        ? query(collection(db, COLLECTIONS.SALES))
        : query(collection(db, COLLECTIONS.SALES), where("userId", "==", auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      const customers = new Set<string>();
      snapshot.docs.forEach(doc => {
        const customer = doc.data().customerName;
        if (customer) customers.add(customer);
      });
      return Array.from(customers).map(name => ({ id: name, name }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "customers");
      return [];
    }
  },

  // Stock Logs
  getStockLogs: async (materialId: string) => {
    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, COLLECTIONS.STOCK_LOGS),
        where("materialId", "==", materialId),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STOCK_LOGS);
      return [];
    }
  },

  addStockLog: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const payload = {
        ...sanitizeData(data),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.STOCK_LOGS), payload);
      return { id: docRef.id };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, COLLECTIONS.STOCK_LOGS);
    }
  },

  cleanupDuplicates: async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      let deletedMaterials = 0;
      let deletedVendors = 0;
      let deletedProducts = 0;

      // 1. Cleanup Materials
      const materialsQ = query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", auth.currentUser.uid));
      const materialsSnap = await getDocs(materialsQ);
      const seenMaterials = new Set<string>();
      materialsSnap.docs.forEach(d => {
        const name = d.data().name?.toLowerCase()?.trim();
        if (name && seenMaterials.has(name)) {
          batch.delete(d.ref);
          deletedMaterials++;
        } else if (name) {
          seenMaterials.add(name);
        }
      });

      // 2. Cleanup Vendors
      const vendorsQ = query(collection(db, COLLECTIONS.VENDORS), where("userId", "==", auth.currentUser.uid));
      const vendorsSnap = await getDocs(vendorsQ);
      const seenVendors = new Set<string>();
      vendorsSnap.docs.forEach(d => {
        const name = d.data().name?.toLowerCase()?.trim();
        if (name && seenVendors.has(name)) {
          batch.delete(d.ref);
          deletedVendors++;
        } else if (name) {
          seenVendors.add(name);
        }
      });

      // 3. Cleanup Products
      const productsQ = query(collection(db, COLLECTIONS.PRODUCTS), where("userId", "==", auth.currentUser.uid));
      const productsSnap = await getDocs(productsQ);
      const seenProducts = new Set<string>();
      productsSnap.docs.forEach(d => {
        const name = d.data().name?.toLowerCase()?.trim();
        if (name && seenProducts.has(name)) {
          batch.delete(d.ref);
          deletedProducts++;
        } else if (name) {
          seenProducts.add(name);
        }
      });

      await batch.commit();

      return { 
        deletedMaterials, 
        deletedVendors, 
        deletedProducts,
        totalDeleted: deletedMaterials + deletedVendors + deletedProducts
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "cleanup-duplicates");
    }
  },

  // Reports (Aggregation done client-side for simplicity, but using Firebase data)
  getReports: async (all: boolean = false) => {
    if (!auth.currentUser && !all) return null;
    try {
      const salesQuery = all 
        ? query(collection(db, COLLECTIONS.SALES))
        : query(collection(db, COLLECTIONS.SALES), where("userId", "==", auth.currentUser?.uid));
      
      const materialsQuery = all
        ? query(collection(db, COLLECTIONS.MATERIALS))
        : query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", auth.currentUser?.uid));

      const [salesSnap, materialsSnap] = await Promise.all([
        getDocs(salesQuery),
        getDocs(materialsQuery)
      ]);

      const sales = salesSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() }));
      const materials = materialsSnap.docs.map(d => d.data());

      const totalSales = sales.reduce((sum, s: any) => sum + (s.totalPrice || 0), 0);
      const totalProfit = sales.reduce((sum, s: any) => sum + (s.profit || 0), 0);
      const totalCost = sales.reduce((sum, s: any) => sum + (s.totalCost || 0), 0);
      
      const inventoryValue = materials.reduce((sum, m: any) => {
        const unitSize = getMaterialBaseUnitSize(m);
        const costPerBaseUnit = (m.costPerUnit || 0) / (unitSize || 1);
        return sum + (costPerBaseUnit * (m.quantityInStock || 0));
      }, 0);

      const lowStockItems = materials
        .filter((m: any) => {
          const unitSize = getMaterialBaseUnitSize(m);
          const totalStock = (m.quantityInStock || 0) * unitSize;
          const min = m.minStockLevel !== undefined ? m.minStockLevel : 5;
          return totalStock <= min;
        })
        .map((m: any) => ({
          name: m.name,
          quantityInStock: m.quantityInStock,
          unit: m.unit
        }));

      const salesByDay = sales.reduce((acc: any, s: any) => {
        const date = (s.createdAt || '').split('T')[0];
        if (!acc[date]) acc[date] = { date, sales: 0, profit: 0 };
        acc[date].sales += s.totalPrice || 0;
        acc[date].profit += s.profit || 0;
        return acc;
      }, {});

      const cogsByProductMap = sales.reduce((acc: any, s: any) => {
        const productName = s.productName || 'Unknown';
        if (!acc[productName]) {
          acc[productName] = { productName, totalCost: 0, totalQuantity: 0 };
        }
        acc[productName].totalCost += s.totalCost || 0;
        acc[productName].totalQuantity += s.quantitySold || 0;
        return acc;
      }, {});

      return {
        totalSales,
        totalProfit,
        totalCost,
        inventoryValue,
        lowStockItems,
        salesByDay: Object.values(salesByDay).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        cogsByProduct: Object.values(cogsByProductMap).sort((a: any, b: any) => b.totalCost - a.totalCost)
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "reports-aggregation");
    }
  },

  // Profile
  getProfile: async () => {
    if (!auth.currentUser) return null;
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${COLLECTIONS.USERS}/${auth.currentUser?.uid}`);
    }
  },

  updateProfile: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const docRef = doc(db, COLLECTIONS.USERS, auth.currentUser.uid);
      await setDoc(docRef, {
        ...sanitizeData(data),
        email: auth.currentUser.email,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.USERS}/${auth.currentUser?.uid}`);
    }
  },

  // Bulk Operations
  bulkMaterialsImport: async (items: any[]) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const docRef = doc(collection(db, COLLECTIONS.MATERIALS));
        batch.set(docRef, {
          ...sanitizeData(item),
          userId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      return { importedCount: items.length, updatedCount: 0 };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "bulk-import");
    }
  },

  bulkVendorsImport: async (items: any[]) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const docRef = doc(collection(db, COLLECTIONS.VENDORS));
        batch.set(docRef, {
          ...sanitizeData(item),
          userId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      return { importedCount: items.length, updatedCount: 0 };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "bulk-vendors-import");
    }
  },

  bulkProductsImport: async (items: any[]) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const docRef = doc(collection(db, COLLECTIONS.PRODUCTS));
        batch.set(docRef, {
          ...sanitizeData(item),
          userId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      return { importedCount: items.length, updatedCount: 0 };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "bulk-products-import");
    }
  },

  // System
  backupData: async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const [materials, products, sales, vendors, users] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", auth.currentUser.uid))),
        getDocs(query(collection(db, COLLECTIONS.PRODUCTS), where("userId", "==", auth.currentUser.uid))),
        getDocs(query(collection(db, COLLECTIONS.SALES), where("userId", "==", auth.currentUser.uid))),
        getDocs(query(collection(db, COLLECTIONS.VENDORS), where("userId", "==", auth.currentUser.uid))),
        getDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid))
      ]);

      return {
        materials: materials.docs.map(d => ({ id: d.id, ...d.data() })),
        products: products.docs.map(d => ({ id: d.id, ...d.data() })),
        sales: sales.docs.map(d => ({ id: d.id, ...d.data() })),
        vendors: vendors.docs.map(d => ({ id: d.id, ...d.data() })),
        profile: users.exists() ? users.data() : null
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "backup");
    }
  },

  restoreData: async (data: any) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const uid = auth.currentUser.uid;
      const batch = writeBatch(db);
      
      // Fetch existing data for mapping and deduplication
      const [existingMaterialsSnap, existingProductsSnap, existingVendorsSnap] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.MATERIALS), where("userId", "==", uid))),
        getDocs(query(collection(db, COLLECTIONS.PRODUCTS), where("userId", "==", uid))),
        getDocs(query(collection(db, COLLECTIONS.VENDORS), where("userId", "==", uid)))
      ]);

      // Maps to store Name -> ID for existing items
      const existingMaterialsByName = new Map(existingMaterialsSnap.docs.map(d => [d.data().name?.toLowerCase()?.trim(), d.id]));
      const existingProductsByName = new Map(existingProductsSnap.docs.map(d => [d.data().name?.toLowerCase()?.trim(), d.id]));
      const existingVendorsByName = new Map(existingVendorsSnap.docs.map(d => [d.data().name?.toLowerCase()?.trim(), d.id]));

      // Map to store Backup ID -> New/Existing Database ID
      const idMap = new Map<string, string>();

      // 1. Process Vendors
      if (data.vendors) {
        data.vendors.forEach((v: any) => {
          const nameTrimmed = v.name?.toLowerCase()?.trim();
          const existingId = existingVendorsByName.get(nameTrimmed);
          
          if (existingId) {
            idMap.set(v.id, existingId);
          } else {
            const newRef = doc(collection(db, COLLECTIONS.VENDORS));
            batch.set(newRef, { ...sanitizeData(v), userId: uid, createdAt: serverTimestamp() });
            idMap.set(v.id, newRef.id);
            existingVendorsByName.set(nameTrimmed, newRef.id);
          }
        });
      }

      // 2. Process Materials
      if (data.materials) {
        data.materials.forEach((m: any) => {
          const nameTrimmed = m.name?.toLowerCase()?.trim();
          const existingId = existingMaterialsByName.get(nameTrimmed);

          if (existingId) {
            idMap.set(m.id, existingId);
          } else {
            const newRef = doc(collection(db, COLLECTIONS.MATERIALS));
            batch.set(newRef, { ...sanitizeData(m), userId: uid, createdAt: serverTimestamp() });
            idMap.set(m.id, newRef.id);
            existingMaterialsByName.set(nameTrimmed, newRef.id);
          }
        });
      }

      // 3. Process Products
      if (data.products) {
        data.products.forEach((p: any) => {
          const nameTrimmed = p.name?.toLowerCase()?.trim();
          const existingId = existingProductsByName.get(nameTrimmed);

          const mappedMaterials = p.materials?.map((matRef: any) => ({
            ...matRef,
            materialId: idMap.get(matRef.materialId) || matRef.materialId
          })) || [];

          if (existingId) {
            idMap.set(p.id, existingId);
            // Optionally update existing product materials if needed, 
            // but the user said "ensure duplicate product are not imported"
          } else {
            const newRef = doc(collection(db, COLLECTIONS.PRODUCTS));
            batch.set(newRef, { 
              ...sanitizeData(p), 
              userId: uid, 
              materials: mappedMaterials,
              createdAt: serverTimestamp() 
            });
            idMap.set(p.id, newRef.id);
            existingProductsByName.set(nameTrimmed, newRef.id);
          }
        });
      }

      // 4. Process Sales
      if (data.sales) {
        data.sales.forEach((s: any) => {
          const newRef = doc(collection(db, COLLECTIONS.SALES));
          const mappedSale = {
            ...sanitizeData(s),
            userId: uid,
            productId: idMap.get(s.productId) || s.productId,
            createdAt: serverTimestamp()
          };
          batch.set(newRef, mappedSale);
        });
      }

      // 5. Profile
      if (data.profile) {
        batch.set(doc(db, COLLECTIONS.USERS, uid), { 
          ...sanitizeData(data.profile), 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }

      await batch.commit();
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "restore");
    }
  },

  resetData: async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    try {
      const collectionsToReset = [COLLECTIONS.MATERIALS, COLLECTIONS.PRODUCTS, COLLECTIONS.SALES, COLLECTIONS.VENDORS, COLLECTIONS.STOCK_LOGS];
      for (const collName of collectionsToReset) {
        const q = query(collection(db, collName), where("userId", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "reset-all");
    }
  }
};
