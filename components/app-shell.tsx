import { AppNav } from './app-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <AppNav />
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  )
}
