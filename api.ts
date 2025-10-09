// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const API_KEY  = import.meta.env.VITE_API_KEY  || "devkey";

// headers για /api/* (χρειάζεται x-api-key)
function authHeaders(extra: Record<string, string> = {}) {
  return { "x-api-key": API_KEY, ...extra };
}

async function getJSON<T>(url: string, withApiKey = false): Promise<T> {
  const res = await fetch(url, { headers: withApiKey ? authHeaders() : {} });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJSON<T>(url: string, body: unknown, withApiKey = false): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: withApiKey
      ? { ...authHeaders({ "Content-Type": "application/json" }) }
      : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patchJSON<T>(url: string, body: unknown, withApiKey = false): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: withApiKey
      ? { ...authHeaders({ "Content-Type": "application/json" }) }
      : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJSON<T>(url: string, body: unknown, withApiKey = false): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: withApiKey
      ? { ...authHeaders({ "Content-Type": "application/json" }) }
      : { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* -------- SCHEDULE / ORDERS -------- */

export async function fetchSchedule(day: string, truckId?: number) {
  const url = new URL(`${API_BASE}/schedule`);
  url.searchParams.set("day", day);
  if (truckId) url.searchParams.set("truck_id", String(truckId));
  return getJSON<any[]>(url.toString());
}

export async function listTrucks() {
  return getJSON<{ id:number; name:string }[]>(`${API_BASE}/trucks`);
}

export async function listClients() {
  return getJSON<any[]>(`${API_BASE}/clients`);
}

export async function createClient(payload: any) {
  return postJSON<any>(`${API_BASE}/clients`, payload);
}

export async function listProducts() {
  return getJSON<any[]>(`${API_BASE}/products`);
}

export async function createOrder(payload: any) {
  return postJSON<any>(`${API_BASE}/orders`, payload);
}

export async function getOrder(id: number) {
  return getJSON<any>(`${API_BASE}/orders/${id}`);
}

export async function updateOrder(id: number, payload: any) {
  return patchJSON<any>(`${API_BASE}/orders/${id}`, payload);
}

// ✨ ΝΕΟ: αυτό ζητά το EditOrderModal
export async function updateOrderStatus(id: number, status: string) {
  return patchJSON<any>(`${API_BASE}/orders/${id}`, { status });
}

export async function replaceOrderItems(id: number, payload: any) {
  return putJSON<any>(`${API_BASE}/orders/${id}/items`, payload);
}

/* -------- PRINT / QUOTES -------- */

export function openOrderQuotePdf(id: number) {
  window.open(`${API_BASE}/quotes/${id}/pdf`, "_blank");
}

export async function sendQuoteEmail(
  orderId: number,
  payload: {to: string[]; cc?: string[]; subject?: string; body?: string;}
) {
  return postJSON<any>(`${API_BASE}/api/quotes/${orderId}/send`, payload, true);
}

export function exportScheduleCsv(day: string, truckId?: number) {
  const url = new URL(`${API_BASE}/api/export/schedule.csv`);
  url.searchParams.set("day", day);
  if (truckId) url.searchParams.set("truck_id", String(truckId));
  window.open(url.toString() + `&x-api-key=${encodeURIComponent(API_KEY)}`, "_blank");
}

export function exportSchedulePdf(day: string, truckId?: number) {
  const url = new URL(`${API_BASE}/api/export/schedule.pdf`);
  url.searchParams.set("day", day);
  if (truckId) url.searchParams.set("truck_id", String(truckId));
  window.open(url.toString() + `&x-api-key=${encodeURIComponent(API_KEY)}`, "_blank");
}

/* -------- FINANCE -------- */

export async function financeSummary(start: string, end: string) {
  const url = new URL(`${API_BASE}/api/finance/summary`);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  return getJSON<any>(url.toString(), true);
}

export async function financeOrders(start: string, end: string) {
  const url = new URL(`${API_BASE}/api/finance/orders`);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  return getJSON<any[]>(url.toString(), true);
}

export async function listExpenses(start?: string, end?: string) {
  const url = new URL(`${API_BASE}/api/finance/expenses`);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return getJSON<any[]>(url.toString(), true);
}

export async function createExpense(payload: {
  date: string; category: string; vendor: string; description: string; amount: number;
}) {
  return postJSON<any>(`${API_BASE}/api/finance/expenses`, payload, true);
}

export async function uploadInvoice(form: FormData) {
  const res = await fetch(`${API_BASE}/api/finance/invoices/upload`, {
    method: "POST",
    headers: authHeaders(), // ΜΗΝ βάλεις Content-Type εδώ
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listInvoices(start?: string, end?: string) {
  const url = new URL(`${API_BASE}/api/finance/invoices`);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  return getJSON<any[]>(url.toString(), true);
}


// Weekly schedule
export async function fetchWeek(start: string, truckId?: number) {
  const url = new URL(`${API_BASE}/schedule/week`);
  url.searchParams.set("start", start); // ISO YYYY-MM-DD
  if (truckId) url.searchParams.set("truck_id", String(truckId));
  return getJSON<any[]>(url.toString());
}

