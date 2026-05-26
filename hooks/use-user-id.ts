'use client'

import { useEffect, useState } from 'react'
import { DEMO_USER_ID } from '@/lib/user'

const STORAGE_KEY = 'careerpilot_user_id'

export function useUserId() {
  const [userId, setUserId] = useState(DEMO_USER_ID)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setUserId(stored)
    else localStorage.setItem(STORAGE_KEY, DEMO_USER_ID)
    setReady(true)
  }, [])

  function updateUserId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setUserId(id)
  }

  return { userId, ready, setUserId: updateUserId }
}
