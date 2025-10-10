/*
  # Create Domika Application Schema

  ## Tables Created
  
  1. **clients**
    - `id` (uuid, primary key)
    - `name` (text, required)
    - `email` (text)
    - `phone` (text)
    - `address` (text)
    - `created_at` (timestamp)
  
  2. **trucks**
    - `id` (serial, primary key)
    - `name` (text, required)
    - `created_at` (timestamp)
  
  3. **products**
    - `id` (uuid, primary key)
    - `name` (text, required)
    - `unit` (text, e.g., "kg", "τμχ")
    - `price` (numeric)
    - `created_at` (timestamp)
  
  4. **orders**
    - `id` (serial, primary key)
    - `client_id` (uuid, foreign key)
    - `truck_id` (integer, foreign key)
    - `delivery_date` (date, required)
    - `time_slot` (text, e.g., "08:00-10:00")
    - `status` (text, default "pending")
    - `notes` (text)
    - `created_at` (timestamp)
  
  5. **order_items**
    - `id` (uuid, primary key)
    - `order_id` (integer, foreign key)
    - `product_id` (uuid, foreign key)
    - `quantity` (numeric, required)
    - `price` (numeric, required)
    - `created_at` (timestamp)
  
  6. **expenses**
    - `id` (uuid, primary key)
    - `date` (date, required)
    - `category` (text, required)
    - `vendor` (text)
    - `description` (text)
    - `amount` (numeric, required)
    - `created_at` (timestamp)
  
  7. **invoices**
    - `id` (uuid, primary key)
    - `date` (date, required)
    - `vendor` (text)
    - `amount` (numeric)
    - `file_url` (text)
    - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Add public access policies (since no auth system is specified)
*/

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to clients"
  ON clients FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trucks table
CREATE TABLE IF NOT EXISTS trucks (
  id serial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to trucks"
  ON trucks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text DEFAULT 'τμχ',
  price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  truck_id integer REFERENCES trucks(id) ON DELETE SET NULL,
  delivery_date date NOT NULL,
  time_slot text,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id integer REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  category text NOT NULL,
  vendor text,
  description text,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to expenses"
  ON expenses FOR ALL
  USING (true)
  WITH CHECK (true);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  vendor text,
  amount numeric,
  file_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to invoices"
  ON invoices FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default trucks
INSERT INTO trucks (name) VALUES ('Φορτηγό 1'), ('Φορτηγό 2')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, unit, price) VALUES
  ('Τσιμέντο', 'σάκος', 8.50),
  ('Άμμος', 'κ.μ.', 25.00),
  ('Σίδερο 8mm', 'kg', 1.20),
  ('Τούβλο', 'τμχ', 0.35)
ON CONFLICT DO NOTHING;