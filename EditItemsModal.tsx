import React, { useEffect, useState } from 'react'
import { getOrder, listProducts, replaceOrderItems } from '../lib/api'

type Product = { id:number; name:string; price:number }

type Props = {
  orderId: number|null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

type Line = { product_id: number|null; qty: number; unit_price: number }

export const EditItemsModal: React.FC<Props> = ({ orderId, open, onClose, onUpdated }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !orderId) return
    setError('')
    Promise.all([getOrder(orderId), listProducts()]).then(([o, ps]) => {
      setProducts(ps)
      setLines(o.items.map((it:any)=>({ product_id: it.product_id, qty: it.qty, unit_price: it.unit_price })))
      if (!o.items.length) setLines([{ product_id: null, qty: 1, unit_price: 0 }])
    }).catch(e=>setError(String(e)))
  }, [open, orderId])

  function setLine(i:number, next:Partial<Line>) {
    setLines(prev => prev.map((l,idx)=> idx===i ? { ...l, ...next } : l))
  }
  function addLine(){ setLines(prev=>[...prev, { product_id: null, qty: 1, unit_price: 0 }]) }
  function removeLine(i:number){ setLines(prev=>prev.filter((_,idx)=>idx!==i)) }

  async function save() {
    if (!orderId) return
    if (lines.some(l=>!l.product_id)) { setError('Επίλεξε προϊόν σε όλες τις γραμμές'); return }
    setLoading(true); setError('')
    try {
      await replaceOrderItems(orderId, lines)
      onUpdated(); onClose()
    } catch (e:any) { setError(e.message || 'Σφάλμα') }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[720px] bg-white shadow-xl p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold">Γραμμές προϊόντων</h2>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-3 border rounded">
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
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <select className="border rounded px-2 py-1 w-full" value={l.product_id ?? ''} onChange={e=>{
                      const id = Number(e.target.value)||null
                      const p = products.find(x=>x.id===id)
                      setLine(i, { product_id: id, unit_price: p?.price || 0 })
                    }}>
                      <option value="">— επιλογή —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="number" step="0.01" className="border rounded px-2 py-1 w-24" value={l.qty} onChange={e=>setLine(i,{qty:Number(e.target.value)})}/></td>
                  <td className="p-2"><input type="number" step="0.01" className="border rounded px-2 py-1 w-32" value={l.unit_price} onChange={e=>setLine(i,{unit_price:Number(e.target.value)})}/></td>
                  <td className="p-2"><button className="text-xs text-red-600" onClick={()=>removeLine(i)}>Διαγραφή</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-between">
          <button className="px-3 py-1.5 text-sm rounded border" onClick={addLine}>+ Προσθήκη</button>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded border" onClick={onClose}>Κλείσιμο</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading} onClick={save}>{loading?'Αποθήκευση…':'Αποθήκευση'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
