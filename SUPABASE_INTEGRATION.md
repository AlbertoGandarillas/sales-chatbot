# Integración Supabase

Tu aplicación Next.js está ahora integrada con Supabase. Esta guía te ayudará a usar la base de datos.

## Configuración

Las variables de entorno están configuradas en tu proyecto:
- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: API Key anónima de Supabase

## Archivos Creados

### 1. `lib/supabase.ts`
Cliente de Supabase reutilizable. Crea una conexión segura a tu BD.

```typescript
import { supabase } from '@/lib/supabase'
```

### 2. `lib/db-service.ts`
Servicio genérico con funciones para:
- `fetchData()` - Obtener datos con filtros opcionales
- `fetchById()` - Obtener un registro por ID
- `insertData()` - Insertar nuevos registros
- `updateData()` - Actualizar registros
- `deleteData()` - Eliminar registros

### 3. `app/supabase-demo/page.tsx`
Página interactiva para gestionar tus datos. Accede en: `http://localhost:3000/supabase-demo`

## Ejemplos de Uso

### Obtener todos los registros de una tabla

```typescript
import { fetchData } from '@/lib/db-service'

const users = await fetchData('users')
```

### Obtener con filtros

```typescript
import { fetchData } from '@/lib/db-service'

// Obtener usuarios activos
const activeUsers = await fetchData('users', {
  eq: { status: 'active' }
})
```

### Insertar datos

```typescript
import { insertData } from '@/lib/db-service'

const newUser = await insertData('users', {
  name: 'Juan Pérez',
  email: 'juan@example.com',
  status: 'active'
})
```

### Actualizar datos

```typescript
import { updateData } from '@/lib/db-service'

const updated = await updateData(
  'users',
  { status: 'inactive' },
  { eq: { id: 1 } }
)
```

### Eliminar datos

```typescript
import { deleteData } from '@/lib/db-service'

await deleteData('users', { eq: { id: 1 } })
```

## En un Componente React

```typescript
'use client'

import { useEffect, useState } from 'react'
import { fetchData } from '@/lib/db-service'

export default function MyComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData('my_table')
        setData(result)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <p>Cargando...</p>

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{JSON.stringify(item)}</div>
      ))}
    </div>
  )
}
```

## Página de Demostración

Visita `http://localhost:3000/supabase-demo` para:
- Consultar cualquier tabla de tu BD
- Insertar nuevos registros
- Eliminar registros
- Ver datos en tiempo real

## Filtros Disponibles

El servicio `db-service.ts` soporta varios tipos de filtros:

- `eq` - Igualdad
- `neq` - Desigualdad
- `gt` - Mayor que
- `lt` - Menor que

```typescript
// Ejemplo con múltiples filtros
const data = await fetchData('products', {
  eq: { category: 'electronics' },
  gt: { price: 100 }
})
```

## Ordenamiento y Paginación

```typescript
// Ordenar por nombre (ascendente)
const data = await fetchData('users', {}, {
  orderBy: 'name',
  ascending: true
})

// Con paginación
const data = await fetchData('users', {}, {
  limit: 10,
  offset: 0,
  orderBy: 'created_at'
})
```

## Solución de Problemas

### Error: Missing Supabase environment variables
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configuradas
- Reinicia el servidor de desarrollo

### Error: Tabla no encontrada
- Asegúrate de que el nombre exacto de la tabla sea correcto
- Verifica que la tabla existe en tu proyecto Supabase

### Error: Permiso denegado
- Comprueba las políticas de Row Level Security (RLS) en Supabase
- Asegúrate de que tu API Key tenga permisos suficientes

## Seguridad

- Las variables `NEXT_PUBLIC_*` son públicas (seguro para datos públicos)
- Para datos sensibles, crea rutas API que usen `SUPABASE_SERVICE_ROLE_KEY`
- Implementa Row Level Security (RLS) en Supabase para más seguridad

## Próximos Pasos

1. Visita la página de demo para probar tu conexión
2. Modifica `db-service.ts` según tus necesidades
3. Implementa autenticación si es necesario
4. Configura RLS en tus tablas para mayor seguridad
