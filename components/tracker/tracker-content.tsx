'use client'

import { useEffect, useRef, useState } from 'react'
import { Application, APPLICATION_STATUSES, ApplicationStatus } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Kanban, 
  Calendar as CalendarIcon, 
  Plus, 
  Building2,
  Briefcase,
  Loader2,
  GripVertical,
  MoreVertical,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface TrackerContentProps {
  userId: string
  initialApplications: Application[]
}

interface SortableApplicationCardProps {
  application: Application
  onEdit: (app: Application) => void
  onDelete: (id: string) => void
}

function SortableApplicationCard({ application, onEdit, onDelete }: SortableApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id })

  const localRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = localRef.current
    if (!el) return
    el.style.transform = transform ? CSS.Transform.toString(transform) ?? '' : ''
    el.style.transition = transition ?? ''
  }, [transform, transition])

  return (
    <div
      ref={(node) => {
        localRef.current = node
        setNodeRef(node)
      }}
      className={`bg-card rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="pt-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{application.job_title}</p>
              <p className="text-xs text-muted-foreground truncate">{application.company}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(application)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(application.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {application.applied_date && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(application.applied_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ApplicationCard({ application }: { application: Application }) {
  return (
    <div className="bg-card rounded-lg border p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="pt-1 text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{application.job_title}</p>
          <p className="text-xs text-muted-foreground truncate">{application.company}</p>
        </div>
      </div>
    </div>
  )
}

export function TrackerContent({ userId, initialApplications }: TrackerContentProps) {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'todos'>('kanban')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Daily To-Dos states
  const [todos, setTodos] = useState<{ id: string; text: string; due_date: string | null; done: boolean }[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodoDueDate, setNewTodoDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [todosLoading, setTodosLoading] = useState(false)

  // Weekly Goals states
  const [goals, setGoals] = useState<{ id: string; text: string; target: number }[]>([])
  const [newGoalText, setNewGoalText] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('5')
  const [goalsLoading, setGoalsLoading] = useState(false)

  const [newApplication, setNewApplication] = useState({
    company: '',
    job_title: '',
    status: 'Applied' as ApplicationStatus,
    applied_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  // Load todos and goals on mount
  useEffect(() => {
    fetch('/api/todos')
      .then(res => res.json())
      .then(data => {
        if (data.todos) setTodos(data.todos)
      })
      .catch(err => console.error('Failed to load todos:', err))

    fetch('/api/goals')
      .then(res => res.json())
      .then(data => {
        if (data.goals) setGoals(data.goals)
      })
      .catch(err => console.error('Failed to load goals:', err))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const applicationId = active.id as string
    const newStatus = over.id as ApplicationStatus

    const application = applications.find(a => a.id === applicationId)
    if (!application || application.status === newStatus) return

    // Optimistic update
    setApplications(apps => 
      apps.map(a => a.id === applicationId ? { ...a, status: newStatus } : a)
    )

    // Update in database
    const res = await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: applicationId, status: newStatus }),
    })

    if (!res.ok) {
      // Revert on error
      setApplications(apps => 
        apps.map(a => a.id === applicationId ? application : a)
      )
    } else {
      // PROACTIVE AGENTIC TRIGGERS: Auto-create actionable To-Dos on status changes!
      try {
        if (newStatus === 'Interviewing') {
          // Trigger interview prep
          const text = `🎯 Prep Interview: Research ${application.company} core values and review requirements for ${application.job_title}`
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + 3) // due in 3 days
          
          await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, due_date: dueDate.toISOString().slice(0, 10) }),
          })
          .then(r => r.json())
          .then(d => {
            if (d.todo) setTodos(prev => [d.todo, ...prev])
          })
        } else if (newStatus === 'Offer') {
          // Trigger salary negotiation / evaluation prep
          const text = `🎉 Offer Review: Evaluate salary & benefits package for ${application.company} (${application.job_title})`
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + 2) // due in 2 days

          await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, due_date: dueDate.toISOString().slice(0, 10) }),
          })
          .then(r => r.json())
          .then(d => {
            if (d.todo) setTodos(prev => [d.todo, ...prev])
          })
        }
      } catch (triggerErr) {
        console.error('Proactive task generation failed:', triggerErr)
      }
    }
  }

  const handleAddApplication = async () => {
    if (!newApplication.company || !newApplication.job_title) return

    setIsLoading(true)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_title: newApplication.job_title,
        company: newApplication.company,
        status: newApplication.status,
        applied_date: newApplication.applied_date || new Date().toISOString().slice(0, 10),
        notes: newApplication.notes || null,
      }),
    })
    const data = await res.json()
    if (res.ok && data.application) {
      setApplications([data.application, ...applications])
      setNewApplication({
        company: '',
        job_title: '',
        status: 'Applied',
        applied_date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
      setIsAddDialogOpen(false)
    }

    setIsLoading(false)
  }

  const handleEditApplication = async () => {
    if (!editingApplication) return

    setIsLoading(true)
    const res = await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingApplication.id,
        status: editingApplication.status,
      }),
    })

    if (res.ok) {
      setApplications(apps => 
        apps.map(a => a.id === editingApplication.id ? editingApplication : a)
      )
      setEditingApplication(null)
    }

    setIsLoading(false)
  }

  const handleDeleteApplication = async (id: string) => {
    await fetch(`/api/applications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setApplications(apps => apps.filter(a => a.id !== id))
  }

  // To-Do items CRUD actions
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoText.trim() || todosLoading) return

    setTodosLoading(true)
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newTodoText.trim(),
          due_date: newTodoDueDate || null
        })
      })
      const data = await res.json()
      if (res.ok && data.todo) {
        setTodos(prev => [data.todo, ...prev])
        setNewTodoText('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTodosLoading(false)
    }
  }

  const handleToggleTodo = async (id: string, done: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, done })
    })
  }

  const handleDeleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/todos?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // Weekly Goals CRUD actions
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalText.trim() || goalsLoading) return

    setGoalsLoading(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newGoalText.trim(),
          target: parseInt(newGoalTarget, 10)
        })
      })
      const data = await res.json()
      if (res.ok && data.goal) {
        setGoals(prev => [...prev, data.goal])
        setNewGoalText('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGoalsLoading(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    await fetch(`/api/goals?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  const getApplicationsByStatus = (status: ApplicationStatus) => 
    applications.filter(a => a.status === status)

  const activeApplication = activeId ? applications.find(a => a.id === activeId) : null

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const getApplicationsForDay = (day: Date) => 
    applications.filter((a) => a.applied_date && isSameDay(parseISO(a.applied_date), day))

  const getTodosForDay = (day: Date) =>
    todos.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day))


  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Kanban className="w-8 h-8 text-primary" />
            Application Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your job applications
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Application</DialogTitle>
              <DialogDescription>
                Track a new job application
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={newApplication.company}
                  onChange={(e) => setNewApplication({ ...newApplication, company: e.target.value })}
                  placeholder="e.g. Tech Corp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job_title">Position *</Label>
                <Input
                  id="job_title"
                  value={newApplication.job_title}
                  onChange={(e) => setNewApplication({ ...newApplication, job_title: e.target.value })}
                  placeholder="e.g. Senior Developer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={newApplication.status} 
                    onValueChange={(value) => setNewApplication({ ...newApplication, status: value as ApplicationStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="applied_date">Applied Date</Label>
                  <Input
                    id="applied_date"
                    type="date"
                    value={newApplication.applied_date}
                    onChange={(e) => setNewApplication({ ...newApplication, applied_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newApplication.notes}
                  onChange={(e) => setNewApplication({ ...newApplication, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddApplication} disabled={isLoading || !newApplication.company || !newApplication.job_title}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Application'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingApplication} onOpenChange={(open) => !open && setEditingApplication(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>
              Update application details
            </DialogDescription>
          </DialogHeader>
          {editingApplication && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={editingApplication.company}
                  onChange={(e) => setEditingApplication({ ...editingApplication, company: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-job_title">Position</Label>
                <Input
                  id="edit-job_title"
                  value={editingApplication.job_title}
                  onChange={(e) => setEditingApplication({ ...editingApplication, job_title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editingApplication.status} 
                    onValueChange={(value) => setEditingApplication({ ...editingApplication, status: value as ApplicationStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-applied_date">Applied Date</Label>
                  <Input
                    id="edit-applied_date"
                    type="date"
                    value={editingApplication.applied_date || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, applied_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingApplication.notes || ''}
                  onChange={(e) => setEditingApplication({ ...editingApplication, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApplication(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditApplication} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'kanban' | 'calendar' | 'todos')}>
        <TabsList>
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="w-4 h-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar & Deadlines
          </TabsTrigger>
          <TabsTrigger value="todos" className="gap-2">
            <Clock className="w-4 h-4" />
            To-Dos & Career Goals
          </TabsTrigger>
        </TabsList>

        {/* Kanban Board */}
        <TabsContent value="kanban" className="mt-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-4 lg:grid-cols-7 overflow-x-auto pb-4">
              {APPLICATION_STATUSES.map((status) => {
                const statusApplications = getApplicationsByStatus(status.value)
                return (
                  <div
                    key={status.value}
                    id={status.value}
                    className="min-w-[240px] lg:min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {statusApplications.length}
                      </Badge>
                    </div>
                    <div 
                      className="bg-muted/50 rounded-lg p-2 min-h-[400px] space-y-2"
                    >
                      <SortableContext
                        items={statusApplications.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {statusApplications.map((application) => (
                          <SortableApplicationCard
                            key={application.id}
                            application={application}
                            onEdit={setEditingApplication}
                            onDelete={handleDeleteApplication}
                          />
                        ))}
                      </SortableContext>
                      {statusApplications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-xs text-muted-foreground">
                            Drop applications here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <DragOverlay>
              {activeApplication && (
                <ApplicationCard application={activeApplication} />
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div 
                    key={day} 
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month start */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-start-${i}`} className="aspect-square p-1" />
                ))}
                
                {/* Day cells */}
                {days.map((day) => {
                  const dayApplications = getApplicationsForDay(day)
                  const dayTodos = getTodosForDay(day)
                  const isToday = isSameDay(day, new Date())
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square p-1 rounded-lg border transition-colors ${
                        isToday 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent hover:border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-xs font-medium ${
                          isToday ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        <div className="flex-1 overflow-hidden space-y-0.5 mt-1">
                          {dayApplications.slice(0, 1).map((app) => (
                            <div
                              key={app.id}
                              className="text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary font-medium"
                              title={`${app.job_title} at ${app.company} (Application)`}
                            >
                              💼 {app.company}
                            </div>
                          ))}
                          {dayTodos.slice(0, 1).map((todo) => (
                            <div
                              key={todo.id}
                              className={cn(
                                "text-[9px] leading-tight truncate px-1 py-0.5 rounded font-medium",
                                todo.done ? "bg-muted text-muted-foreground/60 line-through" : "bg-warning/20 text-warning"
                              )}
                              title={`${todo.text} (To-Do)`}
                            >
                              ✅ {todo.text.replace(/^\[.*?\]\s*/, '')}
                            </div>
                          ))}
                          {(dayApplications.length + dayTodos.length) > 2 && (
                            <div className="text-[9px] text-muted-foreground px-1 font-bold">
                              +{dayApplications.length + dayTodos.length - 2} items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* To-Dos & Weekly Goals Management */}
        <TabsContent value="todos" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Column 1 & 2: Daily To-Dos List */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Daily To-Do List
                  </CardTitle>
                  <CardDescription>Track daily actionable steps towards your career goals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Inline Form */}
                  <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Add a new task (e.g. 'Update LinkedIn profile', 'Review DSA array patterns')..."
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newTodoDueDate}
                        onChange={(e) => setNewTodoDueDate(e.target.value)}
                        className="w-[150px]"
                      />
                      <Button type="submit" disabled={todosLoading}>
                        {todosLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add
                      </Button>
                    </div>
                  </form>

                  {/* Tasks List */}
                  <div className="divide-y max-h-[450px] overflow-y-auto pr-1">
                    {todos.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No tasks scheduled. Add one above or drag application stages to generate them automatically!
                      </p>
                    ) : (
                      todos.map((todo) => (
                        <div key={todo.id} className="flex items-center justify-between py-3 group">
                          <div className="flex items-center space-x-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={todo.done}
                              onChange={(e) => void handleToggleTodo(todo.id, e.target.checked)}
                              className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate leading-relaxed",
                                todo.done ? "text-muted-foreground line-through" : "text-foreground"
                              )}>
                                {todo.text}
                              </p>
                              {todo.due_date && (
                                <span className={cn(
                                  "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1.5",
                                  todo.done ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning"
                                )}>
                                  Due: {format(parseISO(todo.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDeleteTodo(todo.id)}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Weekly Goals Setting */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Weekly Goals
                  </CardTitle>
                  <CardDescription>Keep yourself accountable to weekly benchmarks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddGoal} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="goal-name" className="text-xs">Goal Description</Label>
                      <Input
                        id="goal-name"
                        placeholder="e.g. Apply to 5 jobs, Practice 3 DSA"
                        value={newGoalText}
                        onChange={(e) => setNewGoalText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="goal-target" className="text-xs">Weekly Target Count</Label>
                      <Input
                        id="goal-target"
                        type="number"
                        min="1"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" variant="outline" className="w-full text-xs font-semibold h-9" disabled={goalsLoading}>
                      Add Weekly Goal
                    </Button>
                  </form>

                  <div className="space-y-3 pt-3 border-t">
                    {goals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No weekly goals set yet.</p>
                    ) : (
                      goals.map((goal) => (
                        <div key={goal.id} className="p-3 bg-muted/40 border rounded-xl space-y-2 relative group">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate pr-6">{goal.text}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Weekly Target: {goal.target}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDeleteGoal(goal.id)}
                              className="w-5 h-5 absolute right-2 top-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {applications.length === 0 && activeTab === 'kanban' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No applications yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Start tracking your job applications by adding your first one
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Application
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
