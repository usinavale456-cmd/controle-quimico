"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LayoutDashboard, FileEdit, TrendingUp, BarChart3, LogOut, Hexagon } from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamento", label: "Lançamento", icon: FileEdit },
  { href: "/relatorios", label: "Relatórios", icon: TrendingUp },
  { href: "/analises", label: "Análises", icon: BarChart3 },
]

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-[#1e1e2e] bg-[#0d0d14]">
      <div className="flex items-center gap-3 border-b border-[#1e1e2e] px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
          <Hexagon className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-100">Controle Químico</h2>
          <p className="text-[10px] text-gray-500 tracking-wider uppercase">Safra 2026/2027</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                  : "text-gray-400 hover:bg-[#16161f] hover:text-gray-200"
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : ""}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[#1e1e2e] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-400">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-200">{userName}</p>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">{userRole}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1e1e2e] px-3 py-2 text-xs font-medium text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  )
}
