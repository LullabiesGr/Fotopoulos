import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { ScheduleBoard } from './components/ScheduleBoard'
import { PrintOrder } from './components/PrintOrder'
import FinanceDashboard from './components/FinanceDashboard'
// import { WeeklyBoard } from './components/WeeklyBoard' // αν το έχεις
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ScheduleBoard /> },
      { path: 'finance', element: <FinanceDashboard /> },
      { path: 'print/:id', element: <PrintOrder /> },
      // { path: 'week', element: <WeeklyBoard /> }, // προαιρετικά
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
