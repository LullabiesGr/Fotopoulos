import React, { useEffect, useState } from 'react'
import { getOrder, listTrucks, updateOrder, updateOrderStatus } from '../lib/api'

const STATUSES = ['draft','scheduled','delivered','paid','cancelled'] as const
type Status = typeof STATUSES[number]

type Props = {
  orderId: number|null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export const EditOrderModal: React.FC<Props> = ({ orderId, open, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [trucks, setTrucks] = useState<{id:number;name:string}[]>([])
  const [date, setDate] = useState('')
  const [time_slot, setTimeSlot] = useState('')
  const [truck_id, setTruck] = useState<number|null>(null)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('scheduled')

  useEffect(() => {
    if (!open || !orderId) return
    setError('')
    Promise.all([getOrder(orderId), listTrucks()]).then(([o, ts]) => {
      setTrucks(ts)
      setDate(o.date)
      setTimeSlot(o.time_slot || '')
      setTruck(o.truck_id ?? null)
      setAddress(o.address || '')
      setNotes(o.notes || '')
      setStatus(o.status as Status)
    }).catch(e => setError(String(e)))
  }, [open, orderId])

  async function save() {
    if (!orderId) return
    setLoading(true); setError('')
    try {
      await updateOrder(orderId, { date, time_slot, truck_id, address, notes, status })
      onUpdated(); onClose()
    } catch (e:any) { setError(e.message || 'Σφάλμα') }
    finally { setLoading(false) }
  }

  async function quickStatus(next: Status) {
    if (!orderId) return
    setLoading(true); setError('')
    try {
      await updateOrderStatus(orderId, next)
      setStatus(next)
      onUpdated()
    } catch (e:any) { setError(e.message || 'Σφάλμα') }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[700px] bg-white shadow-xl p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold">Επεξεργασία Παραγγελίας</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-4">
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
            <select className="border rounded px-3 py-2" value={truck_id ?? ''} onChange={e=>setTruck(e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {trucks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Κατάσταση</span>
            <select className="border rounded px-3 py-2" value={status} onChange={e=>setStatus(e.target.value as Status)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 mt-4">
          <span className="text-sm text-gray-600">Διεύθυνση</span>
          <input type="text" className="border rounded px-3 py-2" value={address} onChange={e=>setAddress(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 mt-4">
          <span className="text-sm text-gray-600">Σημειώσεις</span>
          <textarea className="border rounded px-3 py-2 min-h-[80px]" value={notes} onChange={e=>setNotes(e.target.value)} />
        </label>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <span className="text-sm text-gray-600 mr-2">Γρήγορα:</span>
            <button className="px-2 py-1 text-xs rounded border" onClick={()=>quickStatus('delivered')}>delivered</button>
            <button className="px-2 py-1 text-xs rounded border" onClick={()=>quickStatus('paid')}>paid</button>
            <button className="px-2 py-1 text-xs rounded border" onClick={()=>quickStatus('cancelled')}>cancelled</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded border" onClick={onClose}>Κλείσιμο</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={loading} onClick={save}>
              {loading ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
