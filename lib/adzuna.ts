export type AdzunaJob = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  salary_min?: number
  salary_max?: number
  created?: string
}

export async function searchAdzunaJobs(
  query: string,
  location = 'us',
  country = 'us',
  page = 1
): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY must be set')
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    results_per_page: '10',
  })

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`,
    { next: { revalidate: 300 } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Adzuna API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  return (data.results ?? []).map((job: Record<string, unknown>) => ({
    id: String(job.id ?? ''),
    title: String(job.title ?? 'Untitled'),
    company: String((job.company as { display_name?: string })?.display_name ?? 'Unknown'),
    location: String((job.location as { display_name?: string })?.display_name ?? ''),
    description: String(job.description ?? '').slice(0, 2000),
    url: String(job.redirect_url ?? ''),
    salary_min: job.salary_min as number | undefined,
    salary_max: job.salary_max as number | undefined,
    created: job.created as string | undefined,
  }))
}
