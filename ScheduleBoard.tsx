import React, { useEffect, useState } from 'react'
import { fetchSchedule, listTrucks, exportScheduleCsv, exportSchedulePdf, sendQuoteEmail, openOrderQuotePdf } from '../lib/api'
import { NewOrderModal } from './NewOrderModal'
import { EditOrderModal } from './EditOrderModal'
import { EditItemsModal } from './EditItemsModal'
import { Link } from 'react-router-dom'

type SItem = {
  id: number
  client: string
  address: string
  truck: string | null
  time_slot: string
  status: string
  notes: string
}

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export const ScheduleBoard: React.FC = () => {
  const [day, setDay] = useState<string>(todayISO())
  const [truckId, setTruckId] = useState<number | undefined>(undefined)
  const [trucks, setTrucks] = useState<{ id: number; name: string }[]>([])
  const [list, setList] = useState<SItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [openNew, setOpenNew] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [itemsId, setItemsId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchSchedule(day, truckId)
      setList(data)
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listTrucks().then(setTrucks).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [day, truckId])

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <select
            value={truckId ?? ''}
            onChange={(e) =>
              setTruckId(e.target.value ? Number(e.target.value) : undefined)
            }
            className="border px-3 py-2 rounded"
          >
            <option value="">Όλα τα φορτηγά</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button onClick={load} className="px-3 py-2 rounded border">
            Ανανέωση
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportScheduleCsv(day, truckId)}
            className="px-3 py-2 rounded border"
            title="Εξαγωγή CSV για τη μέρα/φορτηγό"
          >
            CSV
          </button>
          <button
            onClick={() => exportSchedulePdf(day, truckId)}
            className="px-3 py-2 rounded border"
            title="Εξαγωγή PDF για τη μέρα/φορτηγό"
          >
            PDF
          </button>
          <button
            onClick={() => setOpenNew(true)}
            className="px-4 py-2 rounded bg-gray-900 text-white"
          >
            + Νέα Παραγγελία
          </button>
        </div>
      </div>

      {loading && <p className="mt-4 text-gray-600">Φόρτωση…</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      <div className="mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 w-40">Ώρα</th>
              <th className="text-left p-3">Πελάτης</th>
              <th className="text-left p-3">Διεύθυνση</th>
              <th className="text-left p-3 w-40">Φορτηγό</th>
              <th className="text-left p-3 w-36">Κατάσταση</th>
              <th className="text-left p-3">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-3">{it.time_slot}</td>
                <td className="p-3">{it.client}</td>
                <td className="p-3">{it.address}</td>
                <td className="p-3">{it.truck ?? '-'}</td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700">
                    {it.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => setEditId(it.id)}
                    >
                      Επεξ.
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => setItemsId(it.id)}
                    >
                      Προϊόντα
                    </button>
                    <Link
                      to={`/print/${it.id}`}
                      className="text-xs px-2 py-1 rounded border"
                    >
                      Εκτύπωση
                    </Link>
                    <button
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => openOrderQuotePdf(it.id)}
                    >
                      Προσφορά PDF
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border"
                      onClick={async () => {
                        const toStr = prompt('Παραλήπτες (comma-separated emails):', 'customer@example.com') || ''
                        const to = toStr.split(',').map(s => s.trim()).filter(Boolean)
                        if (!to.length) return
                        try {
                          await sendQuoteEmail(it.id, { to })
                          alert('Στάλθηκε!')
                        } catch (e:any) {
                          alert('Αποτυχία αποστολής')
                          console.error(e)
                        }
                      }}
                    >
                      Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && !loading && (
              <tr>
                <td className="p-6 text-gray-500" colSpan={6}>
                  Καμία καταγραφή για τη μέρα αυτή.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewOrderModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        defaultDate={day}
        onCreated={load}
      />
      <EditOrderModal
        orderId={editId}
        open={editId !== null}
        onClose={() => setEditId(null)}
        onUpdated={load}
      />
      <EditItemsModal
        orderId={itemsId}
        open={itemsId !== null}
        onClose={() => setItemsId(null)}
        onUpdated={load}
      />
    </div>
  )
}
