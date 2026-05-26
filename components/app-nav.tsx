'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  CalendarDays,
  FileUp,
  LayoutDashboard,
  MessageSquare,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/upload', label: 'CV Upload', icon: FileUp },
  { href: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { href: '/jobs', label: 'Job Hunter', icon: Briefcase },
  { href: '/tracker', label: 'Progress', icon: CalendarDays },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-5">
        <Rocket className="size-5 text-primary" />
        <span className="font-semibold tracking-tight">CareerPilot</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        RAG · Ollama · Adzuna
      </p>
    </aside>
  )
}
