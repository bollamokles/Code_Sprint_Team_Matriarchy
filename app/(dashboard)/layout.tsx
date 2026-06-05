import { Sidebar } from '@/components/sidebar'
import { PageTransition } from '@/components/page-transition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}

