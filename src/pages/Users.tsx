import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  deleteDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { 
  Users as UsersIcon, 
  Shield, 
  User as UserIcon, 
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Trash2,
  AlertTriangle,
  X,
  UserPlus,
  Key,
  Mail,
  Building2,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Crown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { createUserByAdmin, NewUserData } from "../services/userService";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "google">("password");

  const [formData, setFormData] = useState<NewUserData>({
    displayName: "",
    email: "",
    companyName: "",
    role: "user",
    isPro: true,
    password: ""
  });

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      displayName: "",
      email: "",
      companyName: "",
      role: "user",
      isPro: true,
      password: ""
    });
    setAuthMethod("password");
    setAddError(null);
    setShowPassword(false);
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!formData.email.trim()) {
      setAddError("Please provide an email address.");
      return;
    }

    if (!formData.displayName.trim()) {
      setAddError("Please provide the user's full name.");
      return;
    }

    if (authMethod === "password") {
      if (!formData.password || formData.password.trim().length < 6) {
        setAddError("Password must be at least 6 characters long.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await createUserByAdmin({
        ...formData,
        password: authMethod === "password" ? formData.password?.trim() : undefined
      });

      // Add to local state immediately
      const newUserObj = {
        id: result.uid,
        email: formData.email.trim().toLowerCase(),
        displayName: formData.displayName.trim(),
        role: formData.role,
        isPro: formData.isPro,
        companyName: formData.companyName?.trim() || "",
        createdAt: { toDate: () => new Date() },
        preAuthorized: !result.authCreated
      };

      setUsers(prev => [newUserObj, ...prev.filter(u => u.id !== result.uid)]);
      setShowAddModal(false);
      resetForm();

      setNotification({
        type: 'success',
        message: result.message || `User ${formData.email} added successfully!`
      });
      setTimeout(() => setNotification(null), 4000);

      // Background re-fetch to ensure exact timestamp sync
      fetchUsers();
    } catch (err: any) {
      console.error("Error creating user:", err);
      setAddError(err.message || "Failed to create user. Please check the details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (user?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const handleProChange = async (userId: string, isPro: boolean) => {
    if (user?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, "users", userId), { isPro });
      setUsers(users.map(u => u.id === userId ? { ...u, isPro } : u));
    } catch (err) {
      console.error("Error updating pro status:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (user?.role !== 'admin') return;
    if (userId === auth.currentUser?.uid) {
      setNotification({ type: 'error', message: "You cannot delete your own admin account." });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      setNotification({ type: 'success', message: "User profile deleted successfully." });
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      setNotification({ type: 'error', message: "Failed to delete user profile." });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const proCount = users.filter(u => u.isPro).length;
  const standardCount = totalCount - adminCount;

  if (user?.role !== 'admin') {
    return <div className="p-12 text-center text-zinc-500">Access Denied</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header with Search and Add User Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">User Management</h1>
          <p className="text-zinc-500 mt-1">Manage team members, assign admin privileges, and provision user accounts.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none w-full sm:w-64 text-sm"
            />
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Quick Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Users</p>
            <UsersIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{totalCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Administrators</p>
            <Shield className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{adminCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pro Members</p>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{proCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Standard</p>
            <UserIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{standardCount}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Subscription</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold flex-shrink-0">
                          {u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-zinc-900">{u.displayName || 'Unnamed User'}</p>
                            {u.preAuthorized && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending Sign-in
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                          {u.companyName && (
                            <p className="text-[11px] text-zinc-400 font-medium">{u.companyName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs font-bold px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleProChange(u.id, !u.isPro)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          u.isPro 
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200" 
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {u.isPro ? (
                          <>
                            <Crown className="w-3 h-3" />
                            Pro
                          </>
                        ) : (
                          "Free"
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                      {u.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDeletingId(u.id)}
                        title="Delete User"
                        className="p-2 text-zinc-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8 border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Add New User</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Provision an account and assign roles or permissions.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {addError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-left">
              {/* Name & Email */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Company / Brand Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">Company / Brand Name (Optional)</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Ember & Oak Candle Co."
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Role & Subscription Tier */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Role</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: "user" })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        formData.role === "user"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      User
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: "admin" })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        formData.role === "admin"
                          ? "bg-zinc-900 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Subscription Tier</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPro: false })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        !formData.isPro
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPro: true })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                        formData.isPro
                          ? "bg-amber-100 text-amber-900 shadow-sm font-black"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      <Crown className="w-3 h-3 text-amber-600" />
                      Pro
                    </button>
                  </div>
                </div>
              </div>

              {/* Authentication Mode */}
              <div className="pt-2 border-t border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700">Sign-in Provisioning</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMethod("password")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        authMethod === "password"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      Set Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod("google")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        authMethod === "google"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      Google SSO
                    </button>
                  </div>
                </div>

                {authMethod === "password" ? (
                  <div className="space-y-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-600">Initial Password (min 6 chars)</span>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-bold text-zinc-700 hover:text-zinc-900 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Generate Secure
                      </button>
                    </div>
                    <div className="relative">
                      <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required={authMethod === "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      The user will be created immediately and can sign in with this password.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 text-xs text-zinc-600 space-y-1">
                    <p className="font-semibold text-zinc-900">Pre-authorized Google Access</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      The user profile will be pre-registered with their assigned role ({formData.role}) and {formData.isPro ? "Pro" : "Free"} tier. When they click "Continue with Google" using this email, their account will instantly activate.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Delete User Profile?</h3>
              <p className="text-sm text-zinc-500">
                This will remove the user's profile and assigned roles from the system.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={() => handleDeleteUser(deletingId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <p className="text-sm font-medium">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

