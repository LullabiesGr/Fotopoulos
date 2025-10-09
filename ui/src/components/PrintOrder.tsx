import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder } from '../lib/api'

export const PrintOrder: React.FC = () => {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!id) return
    getOrder(Number(id)).then(setOrder).catch(e=>setErr(String(e)))
  }, [id])

  if (err) return <p className="text-red-600">{err}</p>
  if (!order) return <p>Φόρτωση…</p>

  const total = order.items.reduce((s:number, it:any)=> s + it.qty*it.unit_price, 0)

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 print:p-0">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Δελτίο Δρομολογίου</h1>
          <p className="text-sm text-gray-600">Παραγγελία #{order.id}</p>
        </div>
        <button className="px-3 py-1.5 border rounded print:hidden" onClick={()=>window.print()}>Εκτύπωση</button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div><span className="text-gray-500">Ημερομηνία:</span> {order.date}</div>
          <div><span className="text-gray-500">Ώρα:</span> {order.time_slot}</div>
          <div><span className="text-gray-500">Κατάσταση:</span> {order.status}</div>
        </div>
        <div>
          <div><span className="text-gray-500">Πελάτης:</span> {order.client?.name || order.client_id}</div>
          <div><span className="text-gray-500">Διεύθυνση:</span> {order.address}</div>
          <div><span className="text-gray-500">Φορτηγό:</span> {order.truck?.name || order.truck_id || '-'}</div>
        </div>
      </div>

      <div className="mt-6 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Προϊόν</th>
              <th className="text-right p-2 w-24">Ποσότητα</th>
              <th className="text-right p-2 w-28">Τιμή</th>
              <th className="text-right p-2 w-28">Σύνολο</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it:any)=>(
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.product?.name || it.product_id}</td>
                <td className="p-2 text-right">{it.qty}</td>
                <td className="p-2 text-right">{it.unit_price.toFixed(2)} €</td>
                <td className="p-2 text-right">{(it.qty*it.unit_price).toFixed(2)} €</td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50">
              <td className="p-2 font-medium" colSpan={3}>Σύνολο</td>
              <td className="p-2 text-right font-semibold">{total.toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm"><span className="text-gray-500">Σημειώσεις:</span> {order.notes || '-'}</p>
      <style>{`@media print { .print\\:hidden{ display:none } }`}</style>
    </div>
  )
}
