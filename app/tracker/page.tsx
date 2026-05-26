'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, CheckSquare, Columns3, Target, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUserId } from '@/hooks/use-user-id'
import { cn } from '@/lib/utils'

type TrackerItem = {
  id: string
  item_type: 'kanban' | 'todo' | 'goal' | 'event'
  title: string
  description?: string
  status: string
  column_key?: string
  due_date?: string
  start_at?: string
  end_at?: string
  progress: number
}

const KANBAN_COLUMNS = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
]

type Tab = 'kanban' | 'todos' | 'goals' | 'calendar'

const TABS: { id: Tab; label: string; icon: typeof Columns3 }[] = [
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'todos', label: 'To-dos', icon: CheckSquare },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

export default function TrackerPage() {
  const { userId, ready } = useUserId()
  const [tab, setTab] = useState<Tab>('kanban')
  const [items, setItems] = useState<TrackerItem[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [eventDate, setEventDate] = useState('')

  const load = useCallback(async () => {
    if (!ready) return
    const res = await fetch(`/api/tracker?userId=${encodeURIComponent(userId)}`)
    const data = await res.json()
    setItems(data.items ?? [])
  }, [userId, ready])

  useEffect(() => {
    load()
  }, [load])

  async function addItem(extra: Partial<TrackerItem> = {}) {
    const title = newTitle.trim()
    if (!title) return

    const typeMap: Record<Tab, TrackerItem['item_type']> = {
      kanban: 'kanban',
      todos: 'todo',
      goals: 'goal',
      calendar: 'event',
    }

    const payload: Record<string, unknown> = {
      userId,
      item_type: typeMap[tab],
      title,
      column_key: tab === 'kanban' ? 'wishlist' : undefined,
      status: tab === 'todos' ? 'pending' : 'active',
      progress: 0,
      ...extra,
    }
    if (tab === 'calendar' && eventDate) {
      payload.start_at = `${eventDate}T09:00:00.000Z`
      payload.end_at = `${eventDate}T10:00:00.000Z`
    }

    await fetch('/api/tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setNewTitle('')
    load()
  }

  async function updateItem(id: string, patch: Record<string, unknown>) {
    await fetch('/api/tracker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, userId, ...patch }),
    })
    load()
  }

  async function deleteItem(id: string) {
    await fetch(`/api/tracker?id=${id}&userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    load()
  }

  const filtered = items.filter((i) => {
    if (tab === 'kanban') return i.item_type === 'kanban'
    if (tab === 'todos') return i.item_type === 'todo'
    if (tab === 'goals') return i.item_type === 'goal'
    return i.item_type === 'event'
  })

  const eventsByDate = filtered.reduce<Record<string, TrackerItem[]>>((acc, ev) => {
    const d = ev.start_at?.slice(0, 10) ?? ev.due_date ?? 'unscheduled'
    acc[d] = acc[d] ?? []
    acc[d].push(ev)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Progress Tracker</h1>
        <p className="text-muted-foreground">
          Kanban pipeline, to-dos, goals, and calendar for your job search
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(id)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 max-w-lg">
        <Input
          placeholder={
            tab === 'kanban'
              ? 'Add application…'
              : tab === 'todos'
                ? 'Add to-do…'
                : tab === 'goals'
                  ? 'Add goal…'
                  : 'Add event title…'
          }
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 min-w-[200px]"
        />
        {tab === 'calendar' && (
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-40"
          />
        )}
        <Button onClick={() => addItem()}>
          <Plus className="size-4" />
        </Button>
      </div>

      {tab === 'kanban' && (
        <div className="grid gap-4 md:grid-cols-4">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{col.label}</h3>
              {filtered
                .filter((i) => (i.column_key ?? 'wishlist') === col.key)
                .map((item) => (
                  <Card key={item.id} className="py-0">
                    <CardContent className="space-y-2 p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {KANBAN_COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => updateItem(item.id, { column_key: c.key })}
                          >
                            → {c.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'todos' && (
        <div className="max-w-lg space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3',
                item.status === 'done' && 'opacity-60'
              )}
            >
              <input
                type="checkbox"
                checked={item.status === 'done'}
                onChange={(e) =>
                  updateItem(item.id, { status: e.target.checked ? 'done' : 'pending' })
                }
                className="size-4"
              />
              <span className={cn('flex-1 text-sm', item.status === 'done' && 'line-through')}>
                {item.title}
              </span>
              <button type="button" onClick={() => deleteItem(item.id)}>
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No to-dos yet. Add one above.</p>
          )}
        </div>
      )}

      {tab === 'goals' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant="secondary">{item.progress}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={item.progress}
                  onChange={(e) =>
                    updateItem(item.id, { progress: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <button type="button" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="max-w-2xl space-y-4">
          {Object.keys(eventsByDate)
            .sort()
            .map((date) => (
              <div key={date}>
                <h3 className="mb-2 text-sm font-semibold">
                  {date === 'unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString()}
                </h3>
                <div className="space-y-2">
                  {eventsByDate[date].map((ev) => (
                    <Card key={ev.id}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">{ev.title}</p>
                          {ev.start_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(ev.start_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => deleteItem(ev.id)}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add events above (set dates via API or extend UI later).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
