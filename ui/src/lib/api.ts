import { supabase } from './supabase'
import type { Client, Truck, Product, Order, OrderItem } from './supabase'

export async function fetchSchedule(day: string, truckId?: number) {
  let query = supabase
    .from('orders')
    .select(`
      id,
      delivery_date,
      time_slot,
      status,
      notes,
      client:clients(name, address),
      truck:trucks(name)
    `)
    .eq('delivery_date', day)
    .order('time_slot', { ascending: true })

  if (truckId) {
    query = query.eq('truck_id', truckId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []).map((order: any) => ({
    id: order.id,
    client: order.client?.name || 'Unknown',
    address: order.client?.address || '',
    truck: order.truck?.name || null,
    time_slot: order.time_slot || '',
    status: order.status,
    notes: order.notes || ''
  }))
}

export async function listTrucks() {
  const { data, error } = await supabase
    .from('trucks')
    .select('id, name')
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createClient(payload: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createOrder(payload: Partial<Order>) {
  const { data, error } = await supabase
    .from('orders')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getOrder(id: number) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:clients(*),
      truck:trucks(*),
      items:order_items(
        id,
        quantity,
        price,
        product:products(*)
      )
    `)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrder(id: number, payload: Partial<Order>) {
  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrderStatus(id: number, status: string) {
  return updateOrder(id, { status })
}

export async function replaceOrderItems(id: number, items: { product_id: string; quantity: number; price: number }[]) {
  await supabase.from('order_items').delete().eq('order_id', id)

  const itemsToInsert = items.map(item => ({
    order_id: id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price
  }))

  const { data, error } = await supabase
    .from('order_items')
    .insert(itemsToInsert)
    .select()
  if (error) throw new Error(error.message)
  return data
}

export function openOrderQuotePdf(id: number) {
  alert('PDF generation not implemented yet')
}

export async function sendQuoteEmail(
  orderId: number,
  payload: {to: string[]; cc?: string[]; subject?: string; body?: string;}
) {
  alert('Email functionality not implemented yet')
}

export function exportScheduleCsv(day: string, truckId?: number) {
  alert('CSV export not implemented yet')
}

export function exportSchedulePdf(day: string, truckId?: number) {
  alert('PDF export not implemented yet')
}

export async function financeSummary(start: string, end: string) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(quantity, price)')
    .gte('delivery_date', start)
    .lte('delivery_date', end)
    .eq('status', 'completed')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', start)
    .lte('date', end)

  const revenue = (orders || []).reduce((sum, order) => {
    const orderTotal = (order.items || []).reduce((s: number, item: any) => s + (item.quantity * item.price), 0)
    return sum + orderTotal
  }, 0)

  const totalExpenses = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0)

  return {
    revenue,
    expenses: totalExpenses,
    profit: revenue - totalExpenses
  }
}

export async function financeOrders(start: string, end: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      delivery_date,
      status,
      client:clients(name),
      items:order_items(quantity, price)
    `)
    .gte('delivery_date', start)
    .lte('delivery_date', end)
    .order('delivery_date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map(order => ({
    id: order.id,
    date: order.delivery_date,
    client: order.client?.name || 'Unknown',
    status: order.status,
    total: (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)
  }))
}

export async function listExpenses(start?: string, end?: string) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function createExpense(payload: {
  date: string; category: string; vendor: string; description: string; amount: number;
}) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function uploadInvoice(form: FormData) {
  alert('Invoice upload not implemented yet')
  return { message: 'Not implemented' }
}

export async function listInvoices(start?: string, end?: string) {
  let query = supabase
    .from('invoices')
    .select('*')
    .order('date', { ascending: false })

  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function fetchWeek(start: string, truckId?: number) {
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + 6)
  const end = endDate.toISOString().slice(0, 10)

  let query = supabase
    .from('orders')
    .select(`
      id,
      delivery_date,
      time_slot,
      status,
      notes,
      client:clients(name, address),
      truck:trucks(name)
    `)
    .gte('delivery_date', start)
    .lte('delivery_date', end)
    .order('delivery_date')
    .order('time_slot')

  if (truckId) {
    query = query.eq('truck_id', truckId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data || []).map((order: any) => ({
    id: order.id,
    date: order.delivery_date,
    client: order.client?.name || 'Unknown',
    address: order.client?.address || '',
    truck: order.truck?.name || null,
    time_slot: order.time_slot || '',
    status: order.status,
    notes: order.notes || ''
  }))
}

