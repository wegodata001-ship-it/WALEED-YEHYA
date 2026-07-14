"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tractor, Loader2, Phone, Lock } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בהתחברות");
        return;
      }
      // Always use role-safe redirect from server (ignores ?next= into foreign app)
      router.push(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("שגיאת רשת — נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg,#1e3318 0%,#3d6b2e 52%,#eef3e8 52%)" }}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 card-shadow">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md mb-4" style={{ background: "#c4a035", color: "#1e3318" }}>
            <Tractor className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-primary-dark">WALLED YEHYA GROUP</h1>
          <p className="text-sm text-muted mt-1">התחברות למערכת</p>
          <p className="text-[11px] text-muted mt-2">Built by WEGO BUSINESS</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">טלפון נייד</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" className="field-input pr-10" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">סיסמה</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="field-input pr-10" />
            </div>
          </div>
          {error && <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3.5 text-white font-bold hover:bg-primary-dark disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "התחבר"}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-background p-3 text-xs text-muted space-y-1">
          <p className="font-semibold text-primary-dark">התחברות ראשונית:</p>
          <p>טלפון: 0500000000</p>
          <p>סיסמה: 1234</p>
          <p className="pt-1">לאחר הכניסה רשום עובדים, לקוחות, מכונות וכלי רכב במחלקות.</p>
        </div>
      </div>
    </div>
  );
}
