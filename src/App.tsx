import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ChefHat, 
  ShoppingCart, 
  LogOut, 
  Menu, 
  X,
  User,
  TrendingUp,
  Store,
  Calculator as CalculatorIcon,
  BarChart3,
  Users as UsersIcon
} from "lucide-react";
import { cn } from "./lib/utils";
import { api } from "./api";
import { doc, getDocFromServer } from "firebase/firestore";
import { db } from "./firebase";

// Pages
import Dashboard from "./pages/Dashboard";
import Materials from "./pages/Materials";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Login from "./pages/Login";
import Vendors from "./pages/Vendors";
import Calculator from "./pages/Calculator";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import UsersPage from "./pages/Users";

import { AdminProvider, useAdmin } from "./context/AdminContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { Helmet, HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <AdminProvider>
          <Router>
            <ErrorBoundary>
              <Helmet>
                <title>Costing Pro</title>
              </Helmet>
              <AppContent />
            </ErrorBoundary>
          </Router>
        </AdminProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "users", "connection_test"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route
        path="/*"
        element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/products" element={<Products />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                {user?.role === "admin" && <Route path="/users" element={<UsersPage />} />}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
    </Routes>
  );
}

function Layout({ children, user, onLogout }: { children: React.ReactNode; user: any; onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { showAllData, setShowAllData } = useAdmin();
  const { isPro } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Error fetching branding:", err);
      }
    };
    fetchProfile();
  }, [user]);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { 
      name: "Materials", 
      path: "/materials", 
      icon: Package,
      subItems: [
        { name: "All Materials", path: "/materials" },
        { name: "Diffuser Base", path: "/materials?type=Diffuser Base" },
        { name: "Diffuser Bottles", path: "/materials?type=Diffuser Bottles" },
        { name: "Fragrance", path: "/materials?type=Fragrance" },
        { name: "Spray Base", path: "/materials?type=Spray Base" },
        { name: "Vessels", path: "/materials?type=Vessels" },
        { name: "Wax", path: "/materials?type=Wax" },
        { name: "Wicks", path: "/materials?type=Wicks" },
      ]
    },
    { name: "Vendors", path: "/vendors", icon: Store },
    { name: "Products", path: "/products", icon: ChefHat },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Calculator", path: "/calculator", icon: CalculatorIcon },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Menu },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Users", path: "/users", icon: UsersIcon });
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <TrendingUp className="w-6 h-6 text-zinc-900" />
          )}
          <span className="font-bold text-lg truncate max-w-[150px]">
            {profile?.companyName || "CostingPro"}
          </span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-0 z-40 bg-white border-r border-zinc-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:w-64 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 hidden md:flex items-center gap-2 border-b border-zinc-100">
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <TrendingUp className="w-8 h-8 text-zinc-900" />
          )}
          <span className="font-bold text-xl tracking-tight truncate">
            {profile?.companyName || "CostingPro"}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.subItems && location.pathname.startsWith(item.path));
            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            return (
              <div key={item.path} className="space-y-1">
                <Link
                  to={item.path}
                  onClick={() => !hasSubItems && setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
                
                {hasSubItems && isActive && (
                  <div className="pl-11 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {item.subItems?.map((sub) => {
                      const isSubActive = location.pathname + location.search === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            isSubActive
                              ? "text-zinc-900 bg-zinc-100"
                              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                          )}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          {user.role === "admin" && (
            <div className="px-4 py-3 mb-4 bg-zinc-50 rounded-lg border border-zinc-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Admin: Show All</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={showAllData}
                    onChange={(e) => setShowAllData(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                </div>
              </label>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
              {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {user.displayName || user.email.split('@')[0]}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default App;
