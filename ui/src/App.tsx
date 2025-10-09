import React from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { BackButton } from './components/BackButton'   // 👈

function NavItem({to, children}:{to:string; children:React.ReactNode}) {
  return (
    <NavLink
      to={to}
      className={({isActive}) =>
        'px-3 py-2 rounded border ' + (isActive ? 'bg-gray-900 text-white' : '')
      }
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-semibold">D</Link>
            <div>
              <div className="font-semibold">Domika – Orders & Schedule</div>
              <div className="text-xs text-gray-500">Ημερήσιο/Εβδομαδιαίο πρόγραμμα • Οικονομικά</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">v0.5</div>
        </div>
      </header>

      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <NavItem to="/">Ημέρα</NavItem>
          <NavItem to="/finance">Οικονομικά</NavItem>
          <div className="flex-1" />
          <BackButton /> {/* 👈 back button */}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
