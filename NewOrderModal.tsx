import React, { useEffect, useMemo, useState } from 'react'
import { listClients, listProducts, listTrucks, createOrder, createClient } from '../lib/api'

type Client = { id:number; name:string; address:string }
type Product = { id:number; name:string; unit:string; price:number }
type Truck = { id:number; name:string }

type Props = {
  open: boolean
  onClose: () => void
  defaultDate: string
  onCreated: () => void
}

type Item = { product_id: number|null; qty: number; unit_price: number }

export const NewOrderModal: React.FC<Props> = ({ open, onClose, defaultDate, onCreated }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [client_id, setClient] = useState<number|null>(null)
  const [address, setAddress] = useState('')
  const [truck_id, setTruck] = useState<number|null>(null)
  const [date, setDate] = useState(defaultDate)
  const [time_slot, setTimeSlot] = useState('09:00-10:00')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([{ product_id: null, qty: 1, unit_price: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // quick create client
  const [showQuickClient, setShowQuickClient] = useState(false)
  const [qcName, setQcName] = useState('')
  const [qcPhone, setQcPhone] = useState('')
  const [qcAddress, setQcAddress] = useState('')

  useEffect(() => {
    if (!open) return
    Promise.all([listClients(), listProducts(), listTrucks()]).then(([cs, ps, ts]) => {
      setClients(cs); setProducts(ps); setTrucks(ts)
      if (cs.length && client_id === null) setClient(cs[0].id)
      if (ts.length && truck_id === null) setTruck(ts[0].id)
    }).catch(e => setError(String(e)))
  }, [open])

  useEffect(() => setDate(defaultDate), [defaultDate])

  function setItem(idx: number, next: Partial<Item>) {
    setItems(prev => {
      const copy = prev.slice()
      copy[idx] = { ...copy[idx], ...next }
      return copy
    })
  }

  function addLine() { setItems(prev => [...prev, { product_id: null, qty: 1, unit_price: 0 }]) }
  function removeLine(i:number) { setItems(prev => prev.filter((_,idx)=>idx!==i)) }

  const total = useMemo(() => items.reduce((s, it) => s + (it.qty||0) * (it.unit_price||0), 0), [items])

  async function submit() {
    if (!client_id) { setError('Επίλεξε πελάτη'); return }
    if (!items.length || items.some(it=>!it.product_id)) { setError('Πρόσθεσε τουλάχιστον 1 προϊόν'); return }
    setLoading(true); setError('')
    try {
      const payload = { client_id, date, time_slot, truck_id, address, notes,
        items: items.map(it => ({ product_id: it.product_id, qty: it.qty, unit_price: it.unit_price })) }
      await createOrder(payload)
      onCreated()
      onClose()
    } catch (e:any) {
      setError(e.message || 'Σφάλμα δημιουργίας')
    } finally { setLoading(false) }
  }

  async function quickCreateClient() {
    if (!qcName.trim()) { setError('Δώσε όνομα πελάτη'); return }
    setLoading(true); setError('')
    try {
      const c = await createClient({ name: qcName, phone: qcPhone, address: qcAddress, vat_number: '' })
      setClients(prev => [c, ...prev])
      setClient(c.id)
      setShowQuickClient(false)
      if (!address) setAddress(c.address || '')
      setQcName(''); setQcPhone(''); setQcAddress('')
    } catch (e:any) {
      setError(e.message || 'Αποτυχία δημιουργίας πελάτη')
    } finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[720px] bg-white shadow-xl p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold">Νέα Παραγγελία</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Πελάτης</span>
            <div className="flex gap-2">
              <select className="border rounded px-3 py-2 flex-1" value={client_id ?? ''} onChange={e=>setClient(Number(e.target.value)||null)}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="px-3 py-2 text-xs rounded border" onClick={()=>setShowQuickClient(s=>!s)}>
                {showQuickClient ? 'Ακύρωση' : 'Νέος'}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Ημερομηνία</span>
            <input type="date" className="border rounded px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Ώρα</span>
            <input type="text" className="border rounded px-3 py-2" value={time_slot} onChange={e=>setTimeSlot(e.target.value)} placeholder="09:00-10:00" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Φορτηγό</span>
            <select className="border rounded px-3 py-2" value={truck_id ?? ''} onChange={e=>setTruck(Number(e.target.value)||null)}>
              <option value="">—</option>
              {trucks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        {showQuickClient && (
          <div className="mt-3 p-3 border rounded bg-gray-50">
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Όνομα" className="border rounded px-3 py-2" value={qcName} onChange={e=>setQcName(e.target.value)} />
              <input placeholder="Τηλέφωνο" className="border rounded px-3 py-2" value={qcPhone} onChange={e=>setQcPhone(e.target.value)} />
              <input placeholder="Διεύθυνση" className="border rounded px-3 py-2" value={qcAddress} onChange={e=>setQcAddress(e.target.value)} />
            </div>
            <div className="mt-2 text-right">
              <button className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm" onClick={quickCreateClient}>Αποθήκευση πελάτη</button>
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1 mt-4">
          <span className="text-sm text-gray-600">Διεύθυνση παράδοσης</span>
          <input type="text" className="border rounded px-3 py-2" value={address} onChange={e=>setAddress(e.target.value)} placeholder="π.χ. Πατησίων 100" />
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Γραμμές προϊόντων</h3>
            <button className="text-sm px-3 py-1 rounded bg-gray-900 text-white" onClick={addLine}>+ Προσθήκη</button>
          </div>
          <div className="mt-2 border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Προϊόν</th>
                  <th className="text-left p-2 w-24">Ποσότητα</th>
                  <th className="text-left p-2 w-32">Τιμή</th>
                  <th className="text-left p-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <select className="border rounded px-2 py-1 w-full" value={it.product_id ?? ''}
                        onChange={e=>setItem(idx, { product_id: Number(e.target.value)||null, unit_price: products.find(p=>p.id===Number(e.target.value))?.price || 0 })}>
                        <option value="">— επιλογή —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" className="border rounded px-2 py-1 w-24"
                        value={it.qty} onChange={e=>setItem(idx, { qty: Number(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" className="border rounded px-2 py-1 w-32"
                        value={it.unit_price} onChange={e=>setItem(idx, { unit_price: Number(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <button className="text-xs text-red-600" onClick={()=>removeLine(idx)}>Διαγραφή</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <label className="flex flex-col gap-1 mt-4">
          <span className="text-sm text-gray-600">Σημειώσεις</span>
          <textarea className="border rounded px-3 py-2 min-h-[80px]" value={notes} onChange={e=>setNotes(e.target.value)} />
        </label>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">Σύνολο: <span className="font-semibold">{total.toFixed(2)} €</span></div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded border" onClick={onClose}>Άκυρο</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" onClick={submit} disabled={loading}>
              {loading ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
