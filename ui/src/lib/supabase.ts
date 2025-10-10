import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Client = {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  created_at?: string
}

export type Truck = {
  id: number
  name: string
  created_at?: string
}

export type Product = {
  id: string
  name: string
  unit: string
  price: number
  created_at?: string
}

export type Order = {
  id: number
  client_id: string
  truck_id?: number
  delivery_date: string
  time_slot?: string
  status: string
  notes?: string
  created_at?: string
}

export type OrderItem = {
  id: string
  order_id: number
  product_id: string
  quantity: number
  price: number
  created_at?: string
}

export type Expense = {
  id: string
  date: string
  category: string
  vendor?: string
  description?: string
  amount: number
  created_at?: string
}

export type Invoice = {
  id: string
  date: string
  vendor?: string
  amount?: number
  file_url?: string
  created_at?: string
}
