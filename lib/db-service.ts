import { supabase } from './supabase'

/**
 * Servicio genérico para interactuar con Supabase
 * Ejemplos de uso:
 * 
 * // Obtener todos los registros de una tabla
 * const data = await fetchData('users')
 * 
 * // Obtener con filtros
 * const data = await fetchData('users', { eq: { status: 'active' } })
 * 
 * // Insertar datos
 * const result = await insertData('users', { name: 'Juan', email: 'juan@example.com' })
 * 
 * // Actualizar datos
 * const result = await updateData('users', { name: 'Pedro' }, { eq: { id: 1 } })
 * 
 * // Eliminar datos
 * await deleteData('users', { eq: { id: 1 } })
 */

interface FilterOptions {
  eq?: Record<string, any>
  neq?: Record<string, any>
  gt?: Record<string, any>
  lt?: Record<string, any>
}

/**
 * Obtiene datos de una tabla con filtros opcionales
 */
export async function fetchData(
  tableName: string,
  filters?: FilterOptions,
  options?: {
    limit?: number
    offset?: number
    orderBy?: string
    ascending?: boolean
  }
) {
  try {
    let query = supabase.from(tableName).select('*')

    // Aplicar filtros
    if (filters?.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    if (filters?.neq) {
      Object.entries(filters.neq).forEach(([key, value]) => {
        query = query.neq(key, value)
      })
    }
    if (filters?.gt) {
      Object.entries(filters.gt).forEach(([key, value]) => {
        query = query.gt(key, value)
      })
    }
    if (filters?.lt) {
      Object.entries(filters.lt).forEach(([key, value]) => {
        query = query.lt(key, value)
      })
    }

    // Ordenamiento
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true })
    }

    // Paginación
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error fetching from ${tableName}:`, error)
    throw error
  }
}

/**
 * Obtiene un registro específico por ID
 */
export async function fetchById(tableName: string, id: any) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error fetching ${tableName} by ID:`, error)
    throw error
  }
}

/**
 * Inserta un nuevo registro
 */
export async function insertData(tableName: string, payload: Record<string, any>) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert([payload])
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error)
    throw error
  }
}

/**
 * Actualiza un registro existente
 */
export async function updateData(
  tableName: string,
  payload: Record<string, any>,
  filters?: FilterOptions
) {
  try {
    let query = supabase.from(tableName).update(payload)

    // Aplicar filtros
    if (filters?.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query.select()

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error updating ${tableName}:`, error)
    throw error
  }
}

/**
 * Elimina registros
 */
export async function deleteData(tableName: string, filters?: FilterOptions) {
  try {
    let query = supabase.from(tableName).delete()

    // Aplicar filtros
    if (filters?.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { error } = await query

    if (error) throw error
  } catch (error) {
    console.error(`Error deleting from ${tableName}:`, error)
    throw error
  }
}
