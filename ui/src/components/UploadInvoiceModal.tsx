import React, { useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const API_KEY  = import.meta.env.VITE_API_KEY  ?? "";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void; // κάλεσέ το για refresh λίστας μετά το upload
};

function bytesToNice(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];
const OK_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

function isAllowed(f: File) {
  const byMime = OK_MIME.includes(f.type);
  const name = f.name.toLowerCase();
  const byExt = OK_EXT.some(ext => name.endsWith(ext));
  return byMime || byExt;
}

export default function UploadInvoiceModal({ open, onClose, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [vendor, setVendor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [kind, setKind] = useState<"supplier"|"customer">("supplier");
  const [orderId, setOrderId] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  if (!open) return null;

  const pickFile = () => fileRef.current?.click();

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setFile(null); setErr(""); return; }
    if (!isAllowed(f)) { setErr("Επίτρεπτοι τύποι: PDF / JPG / PNG"); e.target.value=""; setFile(null); return; }
    setErr(""); setFile(f);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => setDragging(false);
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!isAllowed(f)) { setErr("Επίτρεπτοι τύποι: PDF / JPG / PNG"); setFile(null); return; }
    setErr(""); setFile(f);
    // συγχρονίζουμε και το input για να μπορεί να σταλεί με FormData
    if (fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      fileRef.current.files = dt.files;
    }
  };

  const clearFile = () => {
    setFile(null); setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (ev) => {
    ev.preventDefault();
    if (!file) { setErr("Διάλεξε αρχείο (PDF/JPG/PNG)"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("date", date);
      fd.append("vendor", vendor || "");
      fd.append("amount", amount || "0");
      fd.append("kind", kind);
      if (orderId.trim()) fd.append("order_id", orderId.trim());

      const res = await fetch(`${API_BASE}/api/finance/invoices/upload`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }
      onUploaded?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Upload error");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* modal */}
      <div className="relative z-10 w-[680px] max-w-[95vw] rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold mb-4">Ανέβασμα τιμολογίου</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Ημ/νία</label>
            <input type="date" className="w-full border rounded px-3 py-2"
              value={date} onChange={e=>setDate(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm mb-1">Προμηθευτής/Πελάτης</label>
            <input className="w-full border rounded px-3 py-2"
              placeholder="Προμηθευτής/Πελάτης"
              value={vendor} onChange={e=>setVendor(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Ποσό</label>
            <input type="number" step="0.01" min="0"
              className="w-full border rounded px-3 py-2"
              placeholder="Ποσό"
              value={amount} onChange={e=>setAmount(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Τύπος</label>
            <select className="w-full border rounded px-3 py-2"
              value={kind} onChange={e=>setKind(e.target.value as any)}>
              <option value="supplier">Προμηθευτή</option>
              <option value="customer">Πελάτη</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Αρχείο</label>

            {/* Hidden input for accessibility / FormData */}
            <input
              ref={fileRef}
              id="inv-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={onInputChange}
            />

            {/* DROP ZONE */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={pickFile}
              role="button"
              tabIndex={0}
              className={[
                "group relative w-full rounded-2xl p-6 text-center",
                "border-2 border-dashed transition-all",
                dragging ? "border-indigo-500 bg-indigo-50" : "border-neutral-300 hover:border-indigo-400 bg-neutral-50/50",
                "cursor-pointer select-none",
              ].join(" ")}
            >
              {/* neon glow */}
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-cyan-400/20 via-fuchsia-400/20 to-emerald-400/20 blur-lg opacity-0 group-hover:opacity-100 transition" />
              <div className="mx-auto mb-2 h-10 w-10 rounded-full border flex items-center justify-center">
                {/* upload arrow icon */}
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                  <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M7 20h10a3 3 0 0 0 3-3v-2M7 20a3 3 0 0 1-3-3v-2" />
                </svg>
              </div>
              <div className="font-medium text-sm">Σύρε εδώ το αρχείο ή <span className="underline">κάνε κλικ</span> για επιλογή</div>
              <div className="text-xs opacity-70 mt-1">Επιτρέπονται: PDF • JPG • PNG</div>

              {file && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="max-w-[70%] truncate rounded-full bg-neutral-200 px-3 py-1 text-sm">
                    {file.name} · {bytesToNice(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="rounded-full px-3 py-1 text-xs border hover:bg-neutral-50"
                  >
                    Καθαρισμός
                  </button>
                </div>
              )}
            </div>

            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="border rounded px-4 py-2">Άκυρο</button>
            <button type="submit"
              className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
              disabled={busy}>
              {busy ? "Μεταφόρτωση..." : "Μεταφόρτωση"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
