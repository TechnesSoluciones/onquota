'use client'

import { useState, useEffect } from 'react'
import { clientContactsApi } from '@/lib/api/client-contacts'
import type {
  ClientContact,
  ClientContactCreate,
  ClientContactUpdate,
  ClientContactListResponse,
} from '@/types/client'

/**
 * Hook to fetch client contacts
 */
export function useClientContacts(
  clientId: string | null,
  page: number = 1,
  pageSize: number = 50,
  isActive?: boolean
) {
  const [data, setData] = useState<ClientContactListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!clientId) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await clientContactsApi.getClientContacts(
        clientId,
        page,
        pageSize,
        isActive
      )
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId, page, pageSize, isActive])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch single client contact
 */
export function useClientContact(clientId: string | null, contactId: string | null) {
  const [data, setData] = useState<ClientContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !contactId) {
        setData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await clientContactsApi.getClientContact(clientId, contactId)
        setData(result)
        setError(null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId, contactId])

  return { data, loading, error }
}

/**
 * Hook to create client contact
 */
export function useCreateClientContact() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createContact = async (clientId: string, data: ClientContactCreate) => {
    try {
      setLoading(true)
      setError(null)
      const result = await clientContactsApi.createClientContact(clientId, data)
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createContact, loading, error }
}

/**
 * Hook to update client contact
 */
export function useUpdateClientContact() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateContact = async (
    clientId: string,
    contactId: string,
    data: ClientContactUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)
      const result = await clientContactsApi.updateClientContact(
        clientId,
        contactId,
        data
      )
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateContact, loading, error }
}

/**
 * Hook to delete client contact
 */
export function useDeleteClientContact() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteContact = async (clientId: string, contactId: string) => {
    try {
      setLoading(true)
      setError(null)
      await clientContactsApi.deleteClientContact(clientId, contactId)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { deleteContact, loading, error }
}
