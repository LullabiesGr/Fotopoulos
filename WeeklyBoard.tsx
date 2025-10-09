import React, { useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { fetchWeek, listTrucks, updateOrder } from '../lib/api'

type Item = { id:number; date:string; time_slot:string; client:string; address:string; truck_id:number|null }
const SLOT_LABELS = ["08:00-10:00","10:00-12:00","12:00-14:00","14:00-16:00","16:00-18:00"]
function startOfWeek(d: Date) { const day=d.getDay()||7; const m=new Date(d); m.setDate(d.getDate()-(day-1)); return new Date(m.getFullYear(),m.getMonth(),m.getDate()) }
function fmtDate(d: Date){ return d.toISOString().slice(0,10) }

export const WeeklyBoard: React.FC = () => {
  const [refDay, setRefDay] = useState<string>(fmtDate(new Date()))
  const [truckId, setTruckId] = useState<number|undefined>(undefined)
  const [trucks, setTrucks] = useState<{id:number;name:string}[]>([])
  const [items, setItems] = useState<Item[]>([])
  const start = useMemo(()=> startOfWeek(new Date(refDay)), [refDay])
  const days = [...Array(7)].map((_,i)=> { const d=new Date(start); d.setDate(start.getDate()+i); return d })
  const activeTrucks = useMemo(()=> truckId ? (trucks.filter(t=>t.id===truckId)) : trucks, [truckId, trucks])

  async function load(){ const res=await fetchWeek(fmtDate(start), truckId); setItems(res) }
  useEffect(()=>{ listTrucks().then(setTrucks).catch(()=>{}) },[])
  useEffect(()=>{ load() },[refDay,truckId])

  const groups = useMemo(() => {
    const m: Record<string, Item[]> = {}
    for (const d of days) for (const t of activeTrucks) for (const s of SLOT_LABELS) m[`${fmtDate(d)}|${s}|${t.id}`] = []
    for (const it of items) {
      const key = `${it.date}|${it.time_slot}|${it.truck_id ?? (activeTrucks[0]?.id ?? 0)}`
      ;(m[key] ||= []).push(it)
    }
    return m
  }, [items, refDay, activeTrucks])

  async function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result
    if (!destination) return
    const [newDate, newSlot, newTruckId] = destination.droppableId.split('|')
    await updateOrder(Number(draggableId), { date: newDate, time_slot: newSlot, truck_id: Number(newTruckId) })
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="date" value={refDay} onChange={e=>setRefDay(e.target.value)} className="border px-3 py-2 rounded" />
        <select value={truckId ?? ''} onChange={e=>setTruckId(e.target.value?Number(e.target.value):undefined)} className="border px-3 py-2 rounded">
          <option value="">Όλα τα φορτηγά</option>
          {trucks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="min-w-[1100px]">
            {/* header trucks */}
            <div className="grid" style={{gridTemplateColumns:`160px repeat(${activeTrucks.length}, 1fr)`}}>
              <div></div>
              {activeTrucks.map(t => <div key={t.id} className="p-2 font-medium">{t.name}</div>)}
            </div>

            {days.map((d) => (
              <div key={fmtDate(d)} className="grid mt-2" style={{gridTemplateColumns:`160px repeat(${activeTrucks.length}, 1fr)`}}>
                <div className="p-2 font-medium text-gray-700">{d.toLocaleDateString('el-GR', {weekday:'short', day:'2-digit', month:'2-digit'})}</div>
                {activeTrucks.map(t => (
                  <div key={t.id} className="space-y-2 p-1">
                    {SLOT_LABELS.map(slot => {
                      const id = `${fmtDate(d)}|${slot}|${t.id}`
                      const list = groups[id] || []
                      return (
                        <Droppable droppableId={id} key={id}>
                          {(p)=>(
                            <div ref={p.innerRef} {...p.droppableProps} className="min-h-[90px] border rounded-lg">
                              <div className="px-2 py-1 text-xs bg-gray-50 border-b rounded-t-lg">{slot}</div>
                              <div className="p-2 space-y-2">
                                {list.map((it, idx)=>(
                                  <Draggable draggableId={String(it.id)} index={idx} key={it.id}>
                                    {(pp)=>(
                                      <div ref={pp.innerRef} {...pp.draggableProps} {...pp.dragHandleProps} style={pp.draggableProps.style}
                                           className="rounded-md border px-2 py-1 text-xs bg-white touch-none select-none">
                                        <div className="font-medium">{it.client}</div>
                                        <div className="text-gray-600">{it.address}</div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {p.placeholder}
                              </div>
                            </div>
                          )}
                        </Droppable>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
