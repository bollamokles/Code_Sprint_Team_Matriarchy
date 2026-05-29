import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase'

const STATUSES = ['Applied', 'Interviewing', 'Offer', 'Rejected'] as const

function isTableMissing(message: string) {
  return /could not find the table/i.test(message) || /relation .* does not exist/i.test(message)
}

export async function GET() {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, user_id, job_title, company, status, applied_date, notes, job_url, salary, location')
    .eq('user_id', userId)
    .order('applied_date', { ascending: false })

  if (error) {
    if (isTableMissing(error.message)) return NextResponse.json({ applications: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const {
      job_title,
      company,
      status,
      applied_date,
      notes,
      job_url,
      salary,
      location,
    } = await req.json()

    if (!job_title || !company || !status || !applied_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const salaryNum = salary === '' || salary === null || salary === undefined ? null : Number(salary)
    const salaryValue = Number.isFinite(salaryNum as number) ? salaryNum : null

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        user_id: userId,
        job_title: String(job_title).trim(),
        company: String(company).trim(),
        status,
        applied_date,
        notes: notes ? String(notes) : null,
        job_url: job_url ? String(job_url) : null,
        salary: salaryValue,
        location: location ? String(location) : null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ application: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  try {
    const { id, status } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ application: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthUserId()
  if ('response' in auth) return auth.response
  const { userId } = auth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin.from('applications').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

