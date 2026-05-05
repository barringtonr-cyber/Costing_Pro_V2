import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
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
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deleteDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
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
    fetchUsers();
  }, []);

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
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return <div className="p-12 text-center text-zinc-500">Access Denied</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">User Management</h1>
          <p className="text-zinc-500 mt-2">Manage roles and permissions for all users.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-none w-full md:w-64"
          />
        </div>
      </div>

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
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                          {u.displayName?.[0] || u.email?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{u.displayName || 'Unnamed User'}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs font-bold px-2 py-1 bg-white border border-zinc-200 rounded-lg focus:outline-none"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleProChange(u.id, !u.isPro)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          u.isPro 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {u.isPro ? (
                          <>
                            <Shield className="w-3 h-3" />
                            Pro
                          </>
                        ) : (
                          "Free"
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {u.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDeletingId(u.id)}
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
                This will only remove the user's record from your database. They will still have their login account but their profile data will be reset.
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
