import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Legend
} from "recharts";
import {
  financeSummary, financeOrders, listExpenses, createExpense, listInvoices,
} from "../lib/api";

/* ----------------- helpers ----------------- */
function todayISO() { return new Date().toISOString().slice(0,10); }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); }
function bytesToNice(n: number) { if (n<1024) return `${n} B`; if (n<1024*1024) return `${(n/1024).toFixed(1)} KB`; return `${(n/(1024*1024)).toFixed(1)} MB`; }
const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://127.0.0.1:8000";
const API_KEY  = (import.meta as any).env.VITE_API_KEY  || "devkey";

/* ----------------- theme colors for charts ----------------- */
const COLORS = {
  blue:   "#0ea5e9",
  green:  "#10b981",
  gray:   "#94a3b8",
  teal:   "#14b8a6",
  orange: "#f59e0b",
};

/* ----------------- Clean Card ----------------- */
function TechCard({children, className=""}:{children:React.ReactNode; className?:string}) {
  return (
    <div className={[
      "rounded-xl",
      "border border-slate-200 dark:border-slate-800",
      "bg-white dark:bg-slate-900",
      "shadow-sm",
      className,
    ].join(" ")}>
      {children}
    </div>
  );
}
function H2({children}:{children:React.ReactNode}) {
  return <h2 className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-400">{children}</h2>;
}
function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className="", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-3 py-2 rounded-lg text-white bg-gradient-to-r from-sky-600 to-teal-600 shadow hover:brightness-[1.08] active:brightness-95 disabled:opacity-60 ${className}`}
    />
  );
}
function GhostBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className="", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 ${className}`}
    />
  );
}

/* ----------------- Dark mode toggle ----------------- */
function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("dmk");
    if (saved === "1") return true;
    if (saved === "0") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("dmk","1"); }
    else { root.classList.remove("dark"); localStorage.setItem("dmk","0"); }
  }, [dark]);
  return { dark, setDark };
}
function DarkToggle() {
  const { dark, setDark } = useDarkMode();
  return (
    <button
      onClick={()=>setDark(!dark)}
      className="px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
      title="Dark mode"
    >
      {dark ? "☀️ Φωτεινό" : "🌙 Σκούρο"}
    </button>
  );
}

/* ============================================================
   UploadInvoiceModal (drag & drop + choose + clear)
   ============================================================ */
type UploadProps = { triggerLabel?: string; onUploaded: () => void; }
function UploadInvoiceModal({ triggerLabel = "+ Τιμολόγιο", onUploaded }: UploadProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [kind, setKind] = useState<"supplier"|"customer">("supplier");
  const [orderId, setOrderId] = useState<number | "">("");

  const [file, setFile] = useState<File|null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const OK_MIME = ["application/pdf","image/jpeg","image/png"];
  const OK_EXT  = [".pdf",".jpg",".jpeg",".png"];
  const isAllowed = (f: File) => OK_MIME.includes(f.type) || OK_EXT.some(ext => f.name.toLowerCase().endsWith(ext));
  const pickFile = () => fileRef.current?.click();

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setFile(null); setErr(""); return; }
    if (!isAllowed(f)) { setErr("Επίτρεπτοι τύποι: PDF / JPG / PNG"); e.target.value=""; setFile(null); return; }
    setErr(""); setFile(f);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => setDragging(false);
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    if (!isAllowed(f)) { setErr("Επίτρεπτοι τύποι: PDF / JPG / PNG"); setFile(null); return; }
    setErr(""); setFile(f);
    if (fileRef.current) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; }
  };
  const clearFile = () => { setFile(null); setErr(""); if (fileRef.current) fileRef.current.value=""; };

  async function submit() {
    if (!file) { setErr("Διάλεξε αρχείο (PDF/JPG/PNG)"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("date", date);
      fd.append("vendor", vendor || "");
      fd.append("amount", String(amount || 0));
      fd.append("kind", kind);
      if (orderId) fd.append("order_id", String(orderId));

      const res = await fetch(`${API_BASE}/api/finance/invoices/upload`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      onUploaded();
    } catch (e:any) { setErr(e?.message ?? "Upload error"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PrimaryBtn onClick={()=>setOpen(true)}>{triggerLabel}</PrimaryBtn>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/70" onClick={()=>setOpen(false)} />
          <div className="relative z-10 w-[720px] max-w-[95vw] animate-fadeIn">
            <TechCard className="p-6">
              <h2 className="text-xl font-semibold mb-4 tracking-tight text-slate-800 dark:text-slate-100">Ανέβασμα τιμολογίου</h2>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-600 dark:text-slate-300">Ημ/νία</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900/60"
                    value={date} onChange={e=>setDate(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-600 dark:text-slate-300">Τύπος</label>
                  <select className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900/60"
                    value={kind} onChange={e=>setKind(e.target.value as any)}>
                    <option value="supplier">Προμηθευτή</option>
                    <option value="customer">Πελάτη</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-600 dark:text-slate-300">Προμηθευτής/Πελάτης</label>
                  <input className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900/60"
                    placeholder="Επωνυμία"
                    value={vendor} onChange={e=>setVendor(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-600 dark:text-slate-300">Ποσό</label>
                  <input type="number" step="0.01" min="0"
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900/60"
                    placeholder="Ποσό"
                    value={amount as any} onChange={e=>setAmount(e.target.value as any)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium mb-1 text-slate-600 dark:text-slate-300">Order ID (προαιρετικό)</label>
                  <input className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900/60"
                    placeholder="Order ID"
                    value={orderId as any} onChange={e=>setOrderId(e.target.value as any)} />
                </div>
              </div>

              <input
                ref={fileRef}
                id="inv-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={onInputChange}
              />

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={pickFile}
                role="button"
                tabIndex={0}
                className={[
                  "group relative w-full rounded-2xl p-6 text-center mt-4",
                  "border-2 border-dashed transition-all",
                  dragging ? "border-sky-500 bg-sky-50 dark:bg-slate-800" : "border-slate-300 hover:border-sky-400 bg-slate-50/70 dark:bg-slate-900/50",
                  "cursor-pointer select-none",
                ].join(" ")}
              >
                <div className="mx-auto mb-2 h-10 w-10 rounded-full border flex items-center justify-center text-slate-700 dark:text-slate-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M7 20h10a3 3 0 0 0 3-3v-2M7 20a3 3 0 0 1-3-3v-2" />
                  </svg>
                </div>
                <div className="font-medium text-sm text-slate-700 dark:text-slate-200">Σύρε εδώ το αρχείο ή <span className="underline">κάνε κλικ</span> για επιλογή</div>
                <div className="text-xs opacity-70 mt-1 text-slate-600 dark:text-slate-400">Επιτρέπονται: PDF • JPG • PNG</div>

                {file && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="max-w-[70%] truncate rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-sm">
                      {file.name} · {bytesToNice(file.size)}
                    </span>
                    <button type="button" onClick={clearFile}
                      className="rounded-full px-3 py-1 text-xs border hover:bg-white dark:hover:bg-slate-900">Καθαρισμός</button>
                  </div>
                )}
              </div>

              {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

              <div className="flex justify-end gap-2 pt-4">
                <GhostBtn onClick={()=>setOpen(false)}>Άκυρο</GhostBtn>
                <PrimaryBtn onClick={submit} disabled={busy}>
                  {busy ? "Μεταφόρτωση..." : "Μεταφόρτωση"}
                </PrimaryBtn>
              </div>
            </TechCard>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== KPI ===================== */
function KPI({title, value}:{title:string; value:any}) {
  return (
    <TechCard className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
        {typeof value==='number' ? `${value.toFixed(2)} €` : value}
      </div>
    </TechCard>
  );
}

/* ================= AddExpenseButton ================= */
function AddExpenseButton({onCreated}:{onCreated:()=>void}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({date: todayISO(), category:'general', vendor:'', description:'', amount:0});
  async function submit() { await createExpense({...form, amount: Number(form.amount)}); setOpen(false); onCreated(); }
  return (
    <>
      <GhostBtn onClick={()=>setOpen(true)}>+ Έξοδο</GhostBtn>
      {open && (
        <div className="fixed inset-0 bg-slate-900/70 grid place-items-center z-50">
          <div className="w-[420px] max-w-[95vw] animate-fadeIn">
            <TechCard className="p-4 space-y-2">
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">Νέο έξοδο</div>
              <input type="date" className="border px-3 py-2 rounded-lg w-full bg-white dark:bg-slate-900/60" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/>
              <input placeholder="Κατηγορία" className="border px-3 py-2 rounded-lg w-full bg-white dark:bg-slate-900/60" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
              <input placeholder="Προμηθευτής" className="border px-3 py-2 rounded-lg w-full bg-white dark:bg-slate-900/60" value={form.vendor} onChange={e=>setForm({...form, vendor:e.target.value})}/>
              <input placeholder="Περιγραφή" className="border px-3 py-2 rounded-lg w-full bg-white dark:bg-slate-900/60" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
              <input type="number" step="0.01" placeholder="Ποσό" className="border px-3 py-2 rounded-lg w-full bg-white dark:bg-slate-900/60" value={form.amount as any} onChange={e=>setForm({...form, amount:e.target.value as any})}/>
              <div className="flex justify-end gap-2 pt-2">
                <GhostBtn onClick={()=>setOpen(false)}>Άκυρο</GhostBtn>
                <PrimaryBtn onClick={submit}>Αποθήκευση</PrimaryBtn>
              </div>
            </TechCard>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------- Mini sticky sidebar ----------------- */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] || "");
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id); },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0,1] }
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids.join(",")]);
  return active;
}
function SideNav({sections}:{sections:{id:string; label:string}[]}) {
  const active = useActiveSection(sections.map(s=>s.id));
  return (
    <nav className="hidden lg:block sticky top-[80px] h-max">
      <ul className="space-y-2">
        {sections.map(s => {
          const is = active===s.id;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
                ${is ? "bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-slate-700" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"}
              `}>
                <span className={`h-1.5 w-1.5 rounded-full ${is ? "bg-sky-500" : "bg-slate-400"}`} />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */
export default function FinanceDashboard() {
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(todayISO());
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [_expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [err, setErr] = useState<string>("");

  // Products map (sku -> name)
  const [productNames, setProductNames] = useState<Record<string,string>>({});
  const nameForSku = (sku?: string) => (sku ? (productNames[sku] || sku) : "");

  // Insights state
  const [insights, setInsights] = useState<any>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [costBusy, setCostBusy] = useState(false);
  const [vh, setVh] = useState<{open:boolean, sku:string, data:any[]}>({open:false, sku:"", data:[]});

  // Charts state
  const [ts, setTs] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [expCats, setExpCats] = useState<any[]>([]);

  // Price suggestions
  const [targetMargin, setTargetMargin] = useState(0.35);
  const [psMonths, setPsMonths] = useState(6);
  const [psLoading, setPsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Upcoming payments
  const [upLoading, setUpLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<any>({items:[], by_vendor:[]});

  // Auto-categorize & vendor rule
  const [autoBusy, setAutoBusy] = useState(false);
  const [vrVendor, setVrVendor] = useState("");
  const [vrCategory, setVrCategory] = useState("");
  const [dupBusy, setDupBusy] = useState(false);

  // NL query
  const [ask, setAsk] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);

  // Competitor / Perplexity search
  const [compBusy, setCompBusy] = useState(false);
  const [compQ, setCompQ] = useState("");
  const [compSku, setCompSku] = useState<string>("");
  const [compResults, setCompResults] = useState<any[]>([]);

  const sections = useMemo(()=>[
    {id:"sec-overview", label:"Επισκόπηση"},
    {id:"sec-insights", label:"Insights"},
    {id:"sec-charts", label:"Γραφήματα"},
    {id:"sec-products", label:"Προϊόντα"},
    {id:"sec-pricing", label:"Τιμές"},
    {id:"sec-payments", label:"Πληρωμές"},
    {id:"sec-categorization", label:"Κατηγοριοποίηση"},
    {id:"sec-competition", label:"Ανταγωνισμός"},
    {id:"sec-ask", label:"Ερωτήσεις"},
    {id:"sec-invoices", label:"Τιμολόγια"},
  ], []);

  async function load() {
    setErr("");
    try {
      const [s, r, e, inv] = await Promise.all([
        financeSummary(start, end),
        financeOrders(start, end),
        listExpenses(start, end),
        listInvoices(start, end),
      ]);
      setSummary(s); setRows(r); setExpenses(e); setInvoices(inv);
    } catch (e:any) { setErr(e.message || "Error"); }
  }

  async function fetchProductsMap(): Promise<Record<string, string>> {
    const endpoints = [`${API_BASE}/api/products`, `${API_BASE}/products`];
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers: { "x-api-key": API_KEY } });
        if (r.ok) {
          const arr = await r.json();
          const map: Record<string,string> = {};
          (arr || []).forEach((p:any)=>{ if (p?.sku) map[p.sku] = p.name || p.sku; });
          return map;
        }
      } catch {}
    }
    return {};
  }

  async function loadInsights() {
    setInsightLoading(true);
    try {
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`${API_BASE}/api/finance/insights?${params.toString()}`, { headers: { "x-api-key": API_KEY } });
      if (!res.ok) throw new Error(await res.text());
      setInsights(await res.json());
    } catch (e:any) {
      setInsights({ brief: `(insights unavailable: ${e.message})`, metrics: {spend_by_vendor:[], price_changes:[]} });
    } finally { setInsightLoading(false); }
  }

  async function loadCharts() {
  const qs = (p:any)=>new URLSearchParams(p).toString();

  const [tsRes, tpRes, ecRes] = await Promise.all([
    fetch(`${API_BASE}/api/finance/timeseries?${qs({start, end})}`, { headers: { "x-api-key": API_KEY }}),
    fetch(`${API_BASE}/api/finance/top-products?${qs({start, end, limit: 10, sort: "revenue"})}`, { headers: { "x-api-key": API_KEY }}),
    fetch(`${API_BASE}/api/finance/expense-categories?${qs({start, end})}`, { headers: { "x-api-key": API_KEY }}),
  ]);

  const tsJson = await tsRes.json();
  const tpJson = await tpRes.json();
  const ecJson = await ecRes.json();

  // 👇 ΠΑΝΤΑ arrays, ό,τι κι αν επιστρέψει ο server
  setTs(Array.isArray(tsJson) ? tsJson : (tsJson.items || tsJson.data || []));
  setTopProducts(Array.isArray(tpJson) ? tpJson : (tpJson.items || tpJson.data || tpJson.results || []));
  setExpCats(Array.isArray(ecJson) ? ecJson : (ecJson.items || ecJson.data || []));
}


  async function loadPriceSuggestions() {
    setPsLoading(true);
    try {
      const qs = new URLSearchParams({ target_margin: String(targetMargin), months: String(psMonths) });
      const r = await fetch(`${API_BASE}/api/finance/price-suggestions?${qs.toString()}`, { headers: { "x-api-key": API_KEY }});
      const data = await r.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } finally { setPsLoading(false); }
  }

  async function loadUpcoming() {
    setUpLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/finance/upcoming-payments?days=14`, { headers: { "x-api-key": API_KEY }});
      const data = await r.json();
      setUpcoming(data || {items:[], by_vendor:[]});
    } finally { setUpLoading(false); }
  }

  useEffect(()=>{ load(); loadInsights(); loadCharts(); loadPriceSuggestions(); loadUpcoming(); }, [start, end]);
  useEffect(()=>{ (async ()=> setProductNames(await fetchProductsMap()))(); }, []);

  async function openInvoice(path: string) {
    const res = await fetch(API_BASE + path, { headers: { "x-api-key": API_KEY } });
    if (!res.ok) { alert("Αποτυχία ανοίγματος αρχείου"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    window.open(url, "_blank"); setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }
  async function deleteInvoice(id: number) {
    if (!confirm("Σίγουρα θέλεις να διαγράψεις το τιμολόγιο;")) return;
    const res = await fetch(`${API_BASE}/api/finance/invoices/${id}`, { method: "DELETE", headers: { "x-api-key": API_KEY } });
    if (!res.ok) { alert(await res.text()); return; }
    await load();
  }
  async function analyzeInvoice(id: number) {
    const res = await fetch(`${API_BASE}/api/finance/invoices/${id}/extract`, { method: "POST", headers: { "x-api-key": API_KEY } });
    if (!res.ok) { const t = await res.text(); alert(`Αποτυχία ανάλυσης: ${t}`); return; }
    alert("Η ανάλυση ολοκληρώθηκε!");
    await load(); await loadInsights(); await loadCharts(); await loadPriceSuggestions();
  }
  async function refreshCosts(months:number=6) {
    if (!confirm(`Να ενημερώσω τα κόστη προϊόντων με βάση τα τιμολόγια των τελευταίων ${months} μηνών;`)) return;
    setCostBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/finance/refresh-costs?months=${months}`, { method: "POST", headers: { "x-api-key": API_KEY } });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      const changed = data.updated?.length ?? 0;
      alert(changed ? `Ενημερώθηκαν ${changed} προϊόντα.` : "Καμία αλλαγή.");
      await load(); await loadPriceSuggestions();
    } catch (e:any) { alert(`Αποτυχία: ${e.message}`); }
    finally { setCostBusy(false); }
  }
  async function openPriceHistory(sku: string) {
    try {
      const res = await fetch(`${API_BASE}/api/finance/vendor-price-history?sku=${encodeURIComponent(sku)}&months=12`, {
        headers: { "x-api-key": API_KEY }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setVh({open:true, sku, data: data.series || []});
    } catch (e:any) { alert(`Αποτυχία λήψης ιστορικού: ${e.message}`); }
  }

  async function autoCategorize() {
    setAutoBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/finance/expenses/auto-categorize`, { method: "POST", headers: { "x-api-key": API_KEY }});
      const d = await r.json();
      alert(`Ενημερώθηκαν ${d.updated || 0} έξοδα.`);
      await loadCharts();
    } finally { setAutoBusy(false); }
  }
  async function addVendorRule() {
    const vendor = vrVendor.trim(); const category = vrCategory.trim();
    if (!vendor || !category) { alert("Συμπλήρωσε vendor και category."); return; }
    const qs = new URLSearchParams({ vendor, category });
    const r = await fetch(`${API_BASE}/api/finance/vendor-rules?${qs.toString()}`, { method: "POST", headers: { "x-api-key": API_KEY }});
    if (!r.ok) { alert(await r.text()); return; }
    setVrVendor(""); setVrCategory("");
    alert("Ο κανόνας αποθηκεύτηκε.");
  }
  async function scanDuplicates() {
    setDupBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/finance/invoices/scan-duplicates`, { method: "POST", headers: { "x-api-key": API_KEY }});
      const d = await r.json();
      alert(`Σημειώθηκαν ${d.duplicates_marked || 0} διπλότυπα.`);
      await load();
    } finally { setDupBusy(false); }
  }
  async function askFinance() {
    if (!ask.trim()) return;
    setAskBusy(true); setAskAnswer(null);
    try {
      const r = await fetch(`${API_BASE}/api/finance/ask`, {
        method: "POST",
        headers: { "x-api-key": API_KEY, "Content-Type":"application/json" },
        body: JSON.stringify({ q: ask })
      });
      const d = await r.json();
      setAskAnswer(d.answer || d.error || "—");
    } finally { setAskBusy(false); }
  }

  // ---- Perplexity competitor search (frontend calls backend proxy) ----
  async function searchCompetitors() {
    const q = compQ.trim() || nameForSku(compSku);
    if (!q) { alert("Γράψε έναν όρο ή διάλεξε προϊόν."); return; }
    setCompBusy(true); setCompResults([]);
    try {
      const r = await fetch(`${API_BASE}/api/finance/competitor-search`, {
        method: "POST",
        headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, sku: compSku || null })
      });
      const d = await r.json();
      // Περιμένουμε {results:[{title, url, vendor, price, snippet}]}
      setCompResults(Array.isArray(d?.results) ? d.results : (Array.isArray(d) ? d : []));
    } catch (e:any) {
      alert(`Αποτυχία αναζήτησης: ${e.message}`);
    } finally {
      setCompBusy(false);
    }
  }

  // --- derive data with product names ---
  const tpData = useMemo(
    () => topProducts.map(p => ({ ...p, label: nameForSku(p.sku) })),
    [topProducts, productNames]
  );

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
      {/* sidebar */}
      <SideNav sections={sections} />

      {/* content */}
      <div className="space-y-6">
        {/* header actions */}
        <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 bg-white/90 dark:bg-slate-900/80 rounded-xl p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"/>
            <span>—</span>
            <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"/>
            <GhostBtn onClick={()=>{load(); loadInsights(); loadCharts(); loadPriceSuggestions(); loadUpcoming();}}>Ανανέωση</GhostBtn>
          </div>
          <div className="flex gap-2">
            <DarkToggle />
            <AddExpenseButton onCreated={load}/>
          </div>
        </div>

        {err && <p className="text-red-600">{err}</p>}

        <section id="sec-overview" className="scroll-mt-24">
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <KPI title="Έσοδα" value={summary.revenue} />
              <KPI title="COGS (Κόστος)" value={summary.cogs} />
              <KPI title="Μικτό Κέρδος" value={summary.gross_profit} />
              <KPI title="Μικτό Περιθώριο" value={(summary.gross_margin*100).toFixed(1)+'%'} />
              <KPI title="Έξοδα" value={summary.expenses} />
              <KPI title="Καθαρό Κέρδος" value={summary.net_profit} />
            </div>
          )}
        </section>

        {/* -------- INSIGHTS -------- */}
        <section id="sec-insights" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Insights</H2>
              <div className="flex gap-2">
                <GhostBtn onClick={loadInsights}>{insightLoading ? "Φόρτωση..." : "Ανανέωση"}</GhostBtn>
                <PrimaryBtn onClick={()=>refreshCosts(6)} disabled={costBusy}>
                  {costBusy ? "Ενημέρωση..." : "Ανανέωση Κόστους"}
                </PrimaryBtn>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Executive Brief */}
              <TechCard className="p-0">
                <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Executive Brief (AI)
                </div>
                <div className="p-3 max-h-64 overflow-y-auto text-sm leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-line">
                  {insights?.brief || "—"}
                </div>
              </TechCard>

              {/* Top Vendors */}
              <TechCard className="p-0">
                <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Top Προμηθευτές
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(insights?.metrics?.top_vendors || []).map((v:any)=>(
                      <li key={v.vendor} className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
                        <span className="truncate text-slate-700 dark:text-slate-200">{v.vendor || "(άγνωστος)"}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{Number(v.amount||0).toFixed(2)} €</span>
                      </li>
                    ))}
                    {(!insights?.metrics?.top_vendors || insights.metrics.top_vendors.length===0) && (
                      <li className="px-2 py-2 text-sm text-slate-500">—</li>
                    )}
                  </ul>
                </div>
              </TechCard>

              {/* Price change alerts */}
              <TechCard className="p-0">
                <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Alerts μεταβολής τιμής (τρέχων vs προηγούμενος μήνας)
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="overflow-x-hidden">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-[30%]" />
                        <col className="w-[18%]" />
                        <col className="w-[18%]" />
                        <col className="w-[18%]" />
                        <col className="w-[10%]" />
                        <col className="w-[6%]" />
                      </colgroup>
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200">
                        <tr>
                          <th className="p-2 text-left">SKU</th>
                          <th className="p-2 text-right">Προηγ. Μ.Ο.</th>
                          <th className="p-2 text-right">Τρέχων Μ.Ο.</th>
                          <th className="p-2 text-right">Διαφορά</th>
                          <th className="p-2 text-right">% </th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(insights?.metrics?.price_changes || []).map((r:any)=>(
                          <tr key={r.sku}>
                            <td className="p-2 truncate">{r.sku}</td>
                            <td className="p-2 text-right">{r.prev_avg.toFixed(4)}</td>
                            <td className="p-2 text-right">{r.curr_avg.toFixed(4)}</td>
                            <td className="p-2 text-right">{r.delta.toFixed(4)}</td>
                            <td className={`p-2 text-right ${r.pct>0?'text-red-600':'text-emerald-600'}`}>{r.pct.toFixed(1)}%</td>
                            <td className="p-2 text-right">
                              <button className="text-sky-700 dark:text-sky-300 underline" onClick={()=>openPriceHistory(r.sku)}>Ιστορικό</button>
                            </td>
                          </tr>
                        ))}
                        {(!insights?.metrics?.price_changes || insights.metrics.price_changes.length===0) && (
                          <tr><td className="p-3 text-slate-500" colSpan={6}>Δεν βρέθηκαν μεταβολές.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TechCard>
            </div>
          </TechCard>
        </section>

        {/* -------- CHARTS -------- */}
        <section id="sec-charts" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="font-semibold mb-2 tracking-tight text-slate-800 dark:text-slate-100">Ροή Εσόδων/Εξόδων/Κέρδους</div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={ts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tickFormatter={(v)=>`${v}€`} width={70}/>
                  <Tooltip formatter={(v:number)=>`${v.toFixed(2)} €`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Έσοδα" stroke={COLORS.blue}/>
                  <Line type="monotone" dataKey="expenses" name="Έξοδα" stroke={COLORS.gray}/>
                  <Line type="monotone" dataKey="profit" name="Κέρδος" stroke={COLORS.green}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TechCard>
        </section>

        {/* -------- TOP PRODUCTS & EXPENSE CATS -------- */}
        <section id="sec-products" className="scroll-mt-24 grid md:grid-cols-2 gap-4">
          <TechCard className="p-4">
            <div className="font-semibold mb-2 text-slate-800 dark:text-slate-100">Top Προϊόντα (έσοδα)</div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={tpData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" /> {/* όνομα προϊόντος */}
                  <YAxis tickFormatter={(v)=>`${v}€`} width={70}/>
                  <Tooltip formatter={(v:number)=>`${v.toFixed(2)} €`} labelFormatter={(l:any)=>String(l)} />
                  <Bar dataKey="revenue" name="Έσοδα" fill={COLORS.teal}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TechCard>

          <TechCard className="p-4">
            <div className="font-semibold mb-2 text-slate-800 dark:text-slate-100">Έξοδα ανά κατηγορία</div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expCats} dataKey="amount" nameKey="category" outerRadius={100} label fill={COLORS.orange} />
                  <Tooltip formatter={(v:number)=>`${v.toFixed(2)} €`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TechCard>
        </section>

        {/* -------- PRICE SUGGESTIONS -------- */}
        <section id="sec-pricing" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Προτεινόμενες τιμές πώλησης</H2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-300">Margin:</label>
                <input type="number" step="0.01" min={0.05} max={0.8} value={targetMargin}
                       onChange={(e)=>setTargetMargin(Number(e.target.value))}
                       className="w-20 border px-2 py-1 rounded bg-white dark:bg-slate-900/60"/>
                <label className="text-sm text-slate-600 dark:text-slate-300">Μήνες:</label>
                <select value={psMonths} onChange={(e)=>setPsMonths(Number(e.target.value))}
                        className="border px-2 py-1 rounded bg-white dark:bg-slate-900/60">
                  {[3,6,9,12].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                <GhostBtn onClick={loadPriceSuggestions}>{psLoading ? "Φόρτωση..." : "Υπολογισμός"}</GhostBtn>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="p-2 text-left">Προϊόν</th>
                    <th className="p-2 text-right">Avg Cost</th>
                    <th className="p-2 text-right">Τρέχ. Avg Τιμή</th>
                    <th className="p-2 text-right">Πρόταση</th>
                    <th className="p-2 text-right">Διαφορά</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s:any)=>(
                    <tr key={s.sku} className="border-t">
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{nameForSku(s.sku)}</span>
                          <span className="text-xs text-slate-500">{s.sku}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right">{s.avg_cost.toFixed(4)}</td>
                      <td className="p-2 text-right">{s.current_price_avg==null ? "—" : s.current_price_avg.toFixed(4)}</td>
                      <td className="p-2 text-right font-semibold">{s.suggested_price.toFixed(4)}</td>
                      <td className={`p-2 text-right ${s.delta_vs_current==null?"text-slate-500": (s.delta_vs_current>0?"text-emerald-600":"text-red-600")}`}>
                        {s.delta_vs_current==null ? "—" : s.delta_vs_current.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  {suggestions.length===0 && <tr><td className="p-3 text-slate-500" colSpan={5}>—</td></tr>}
                </tbody>
              </table>
            </div>
          </TechCard>
        </section>

        {/* -------- UPCOMING PAYMENTS -------- */}
        <section id="sec-payments" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Επικείμενες Πληρωμές (14 ημέρες)</H2>
              <GhostBtn onClick={loadUpcoming}>{upLoading ? "Φόρτωση..." : "Ανανέωση"}</GhostBtn>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <TechCard className="p-0 md:col-span-1">
                <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Σύνοψη ανά προμηθευτή
                </div>
                <ul className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {(upcoming.by_vendor || []).map((v:any)=>(
                    <li key={v.vendor} className="px-3 py-2 flex justify-between text-sm">
                      <span className="truncate">{v.vendor}</span>
                      <span className="font-semibold">{v.amount.toFixed(2)} €</span>
                    </li>
                  ))}
                  {(!upcoming.by_vendor || upcoming.by_vendor.length===0) && <li className="px-3 py-2 text-sm text-slate-500">—</li>}
                </ul>
              </TechCard>
              <TechCard className="p-0 md:col-span-2">
                <div className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Αναλυτικά
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        <th className="p-2 text-left">Ημ/νία</th>
                        <th className="p-2 text-left">Προμηθευτής</th>
                        <th className="p-2 text-right">Ποσό</th>
                        <th className="p-2 text-right">Σε ημέρες</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(upcoming.items || []).map((i:any)=>(
                        <tr key={i.id} className="border-t">
                          <td className="p-2">{i.due_date}</td>
                          <td className="p-2">{i.vendor}</td>
                          <td className="p-2 text-right">{(+i.amount).toFixed(2)} €</td>
                          <td className="p-2 text-right">{i.days_left}</td>
                        </tr>
                      ))}
                      {(!upcoming.items || upcoming.items.length===0) && <tr><td className="p-3 text-slate-500" colSpan={4}>—</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TechCard>
            </div>
          </TechCard>
        </section>

        {/* -------- CATEGORIZATION -------- */}
        <section id="sec-categorization" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Κατηγοριοποίηση εξόδων</H2>
              <div className="flex gap-2">
                <GhostBtn onClick={autoCategorize}>{autoBusy ? "Εκτέλεση..." : "Auto-Categorize"}</GhostBtn>
              </div>
            </div>
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2">
              <input placeholder="Vendor (π.χ. KAFUROS)"
                     className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"
                     value={vrVendor} onChange={e=>setVrVendor(e.target.value)} />
              <input placeholder="Category (π.χ. supplies)"
                     className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"
                     value={vrCategory} onChange={e=>setVrCategory(e.target.value)} />
              <PrimaryBtn onClick={addVendorRule}>Προσθήκη κανόνα</PrimaryBtn>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Ο κανόνας αποθηκεύεται (Vendor → Category). Το Auto-Categorize χρησιμοποιεί πρώτα κανόνες και έπειτα AI.
            </p>
          </TechCard>
        </section>

        {/* -------- COMPETITION (Perplexity) -------- */}
        <section id="sec-competition" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Ανταγωνισμός – Αναζήτηση τιμών (Perplexity)</H2>
            </div>

            <div className="grid md:grid-cols-[1fr_220px_auto] gap-2">
              <input
                className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"
                placeholder="Π.χ. '3Α οδοστρωσίας τιμή big bag Αθήνα'"
                value={compQ} onChange={e=>setCompQ(e.target.value)}
              />
              <select
                className="border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"
                value={compSku} onChange={(e)=>setCompSku(e.target.value)}
              >
                <option value="">— επίλεξε προϊόν (προαιρετικό) —</option>
                {Object.entries(productNames).map(([sku, name])=>(
                  <option key={sku} value={sku}>{name} ({sku})</option>
                ))}
              </select>
              <PrimaryBtn onClick={searchCompetitors} disabled={compBusy}>
                {compBusy ? "Αναζήτηση..." : "Αναζήτηση"}
              </PrimaryBtn>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Το frontend καλεί τον endpoint <code>/api/finance/competitor-search</code> (backend proxy προς Perplexity).
              Περιμένει <code>{`{results:[{title,url,vendor,price,snippet}]}`}</code>.
            </p>

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {compResults.map((r:any, i:number)=>(
                <TechCard key={i} className="p-3">
                  <div className="text-sm font-semibold truncate">{r.title || r.vendor || "Αποτέλεσμα"}</div>
                  <div className="text-xs text-slate-500 truncate">{r.vendor || r.url}</div>
                  <div className="mt-1 text-sm">{r.snippet}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-semibold">{r.price ? `${(+r.price).toFixed(2)} €` : "—"}</div>
                    {r.url && <a className="text-sky-700 dark:text-sky-300 underline" href={r.url} target="_blank" rel="noreferrer">Άνοιγμα</a>}
                  </div>
                </TechCard>
              ))}
              {compResults.length===0 && (
                <div className="text-sm text-slate-500">Δεν υπάρχουν αποτελέσματα ακόμα.</div>
              )}
            </div>
          </TechCard>
        </section>

        {/* -------- NL ASK -------- */}
        <section id="sec-ask" className="scroll-mt-24">
          <TechCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <H2>Ρώτησε με φυσική γλώσσα</H2>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60"
                placeholder='π.χ. "πόσα δώσαμε στον ΚΑΦΟΥΡΟΣ τον Σεπτέμβριο 2025;"'
                value={ask} onChange={e=>setAsk(e.target.value)}
              />
              <PrimaryBtn onClick={askFinance} disabled={askBusy}>{askBusy ? "Ανάλυση..." : "Ρώτα"}</PrimaryBtn>
            </div>
            {askAnswer && <div className="mt-3 text-sm font-medium">{askAnswer}</div>}
          </TechCard>
        </section>

        {/* -------- ORDERS & INVOICES -------- */}
        <section className="grid md:grid-cols-2 gap-4">
          <TechCard className="p-0 overflow-hidden">
            <div className="p-3 font-semibold text-slate-800 dark:text-slate-100">Κερδοφορία ανά παραγγελία</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="p-2 text-left">Ημ/νία</th>
                    <th className="p-2 text-left">Παραγγελία</th>
                    <th className="p-2 text-left">Πελάτης</th>
                    <th className="p-2 text-right">Έσοδα</th>
                    <th className="p-2 text-right">COGS</th>
                    <th className="p-2 text-right">Κέρδος</th>
                    <th className="p-2 text-right">Περιθώριο</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r=>(
                    <tr key={r.order_id} className="border-t">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2">#{r.order_id}</td>
                      <td className="p-2">{r.client}</td>
                      <td className="p-2 text-right">{r.revenue.toFixed(2)} €</td>
                      <td className="p-2 text-right">{r.cogs.toFixed(2)} €</td>
                      <td className="p-2 text-right">{r.profit.toFixed(2)} €</td>
                      <td className="p-2 text-right">{(r.margin*100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {rows.length===0 && <tr><td className="p-4 text-slate-500" colSpan={7}>Καμία παραγγελία στην περίοδο.</td></tr>}
                </tbody>
              </table>
            </div>
          </TechCard>

          <TechCard id="sec-invoices" className="p-0 overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <div className="font-semibold text-slate-800 dark:text-slate-100">Τιμολόγια</div>
              <div className="flex gap-2">
                <GhostBtn onClick={scanDuplicates} disabled={dupBusy}>{dupBusy ? "Έλεγχος..." : "Scan διπλότυπα"}</GhostBtn>
                <UploadInvoiceModal triggerLabel="+ Τιμολόγιο" onUploaded={()=>{load(); loadInsights(); loadCharts(); loadPriceSuggestions();}}/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="p-2 text-left">Ημ/νία</th>
                    <th className="p-2 text-left">Προμηθευτής/Πελάτης</th>
                    <th className="p-2 text-right">Ποσό</th>
                    <th className="p-2 text-left">Τύπος</th>
                    <th className="p-2 text-left">Αρχείο</th>
                    <th className="p-2 text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i:any)=>(
                    <tr key={i.id} className="border-t">
                      <td className="p-2">{i.date}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span>{i.vendor}</span>
                          {i.duplicate_of_id ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 border border-red-200">Διπλότυπο</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-2 text-right">{(+i.amount).toFixed(2)} €</td>
                      <td className="p-2">{i.kind}</td>
                      <td className="p-2">
                        <button className="text-sky-700 dark:text-sky-300 underline" onClick={()=>openInvoice(i.file_url)}>Άνοιγμα</button>
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <GhostBtn
                          onClick={()=>analyzeInvoice(i.id)}
                          className="border-sky-300 text-sky-700 dark:text-sky-300 hover:bg-sky-50/50 dark:hover:bg-slate-800/60"
                        >
                          Ανάλυση (AI)
                        </GhostBtn>
                        <GhostBtn
                          onClick={()=>deleteInvoice(i.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50/50 dark:hover:bg-slate-800/60"
                        >
                          Διαγραφή
                        </GhostBtn>
                      </td>
                    </tr>
                  ))}
                  {invoices.length===0 && <tr><td className="p-4 text-slate-500" colSpan={6}>Δεν υπάρχουν τιμολόγια.</td></tr>}
                </tbody>
              </table>
            </div>
          </TechCard>
        </section>

        {/* -------- PRICE HISTORY MODAL -------- */}
        {vh.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/70" onClick={()=>setVh({open:false, sku:"", data:[]})}/>
            <div className="relative z-10 w-[760px] max-w-[95vw] animate-fadeIn">
              <TechCard className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">Ιστορικό τιμής – {vh.sku}</div>
                  <GhostBtn onClick={()=>setVh({open:false, sku:"", data:[]})}>Κλείσιμο</GhostBtn>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        <th className="p-2 text-left">Μήνας</th>
                        <th className="p-2 text-left">Προμηθευτής</th>
                        <th className="p-2 text-right">Μ.Ο. Τιμή</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vh.data.map((r:any, idx:number)=>(
                        <tr key={idx} className="border-t">
                          <td className="p-2">{r.ym}</td>
                          <td className="p-2">{r.vendor}</td>
                          <td className="p-2 text-right">{Number(r.avg_price).toFixed(4)}</td>
                        </tr>
                      ))}
                      {vh.data.length===0 && <tr><td className="p-3 text-slate-500" colSpan={3}>—</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TechCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
