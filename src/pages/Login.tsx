import React, { useState } from "react";
import { 
  signInWithPopup, 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { 
  Flame, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  ShieldCheck,
  Package,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-200/40 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 relative z-10"
      >
        {/* Left Side: Branding & Features */}
        <div className="p-8 md:p-12 bg-zinc-900 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10">
            <div className="grid grid-cols-6 gap-4 p-4 transform rotate-12">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="w-12 h-12 border border-white rounded-lg"></div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <Flame className="w-6 h-6 text-zinc-900" />
              </div>
              <span className="text-xl font-black tracking-tighter">COSTING PRO</span>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-8">
              Take complete control of your production costs.
            </h2>

            <div className="space-y-6">
              {[
                { icon: Package, text: "Inventory Management tracking for raw materials." },
                { icon: Layers, text: "Precise COGS calculation for every finished product." },
                { icon: BarChart3, text: "Dynamic sales reports and profit analysis." },
                { icon: ShieldCheck, text: "Secure, reliable cloud-based data storage." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1">
                    <feature.icon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                    U
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 font-medium tracking-wide">
                Trusted by makers worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center items-center text-center">
          <div className="max-w-sm w-full space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Welcome Back</h1>
              <p className="text-zinc-500 text-sm mt-2">
                Sign in to manage your inventory and sales.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 hover:bg-zinc-50 hover:shadow-sm transition-all relative overflow-hidden group disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 flex items-center justify-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {error}
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[240px] mx-auto uppercase font-bold tracking-widest">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>

            <div className="pt-8 grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 rounded-2xl text-left hover:bg-zinc-100/50 transition-colors cursor-default">
                <p className="text-xl font-bold text-zinc-900">100%</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cloud Sync</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl text-left hover:bg-zinc-100/50 transition-colors cursor-default">
                <p className="text-xl font-bold text-zinc-900">Bank-Grade</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Encryption</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Decorative Text */}
      <div className="mt-12 text-center relative z-10">
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[.5em]">Inventory Costing Profit Analytics Reports</p>
      </div>
    </div>
  );
}
