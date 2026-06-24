'use client'

import { useEffect, useState } from 'react'
import { fetchData, insertData, updateData, deleteData } from '@/lib/db-service'

interface DataItem {
  id?: any
  [key: string]: any
}

export default function SupabaseDemo() {
  const [tableName, setTableName] = useState('')
  const [data, setData] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRecord, setNewRecord] = useState<Record<string, any>>({})

  const handleFetchData = async () => {
    if (!tableName.trim()) {
      setError('Por favor ingresa el nombre de la tabla')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchData(tableName)
      setData(result || [])
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos')
    } finally {
      setLoading(false)
    }
  }

  const handleInsertRecord = async () => {
    if (!newRecord.name && Object.keys(newRecord).length === 0) {
      setError('Por favor proporciona datos para insertar')
      return
    }

    try {
      await insertData(tableName, newRecord)
      setNewRecord({})
      await handleFetchData()
    } catch (err: any) {
      setError(err.message || 'Error al insertar')
    }
  }

  const handleDeleteRecord = async (id: any) => {
    try {
      await deleteData(tableName, { eq: { id } })
      await handleFetchData()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Supabase Demo</h1>
        <p className="text-slate-300 mb-8">Gestor de datos conectado a tu base de datos Supabase</p>

        {/* Configuración */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Configuración</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la tabla
              </label>
              <input
                type="text"
                placeholder="ej: users, products, orders"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleFetchData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium rounded transition"
            >
              {loading ? 'Cargando...' : 'Obtener Datos'}
            </button>
          </div>
        </div>

        {/* Errores */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Insertar nuevo registro */}
        {tableName && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Insertar Nuevo Registro</h2>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Nombre del campo (ej: name)"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const fieldName = (e.target as HTMLInputElement).value
                    if (fieldName) {
                      const valueInput = (document.querySelector('[placeholder="Valor del campo"]') as HTMLInputElement)
                      if (valueInput?.value) {
                        setNewRecord({ ...newRecord, [fieldName]: valueInput.value })
                        ;(e.target as HTMLInputElement).value = ''
                        valueInput.value = ''
                      }
                    }
                  }
                }}
              />
              <input
                type="text"
                placeholder="Valor del campo"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 p-3 bg-slate-700 rounded">
              <p className="text-sm text-slate-300">Datos a insertar:</p>
              <pre className="text-xs text-slate-200 mt-2">{JSON.stringify(newRecord, null, 2)}</pre>
            </div>

            <button
              onClick={handleInsertRecord}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition"
            >
              Insertar Registro
            </button>
          </div>
        )}

        {/* Tabla de datos */}
        {data.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 overflow-x-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Datos ({data.length} registros)</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {data.length > 0 &&
                      Object.keys(data[0]).map((key) => (
                        <th key={key} className="px-4 py-2 text-left text-slate-300 font-medium">
                          {key}
                        </th>
                      ))}
                    <th className="px-4 py-2 text-left text-slate-300 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                      {Object.values(row).map((value, colIdx) => (
                        <td key={colIdx} className="px-4 py-2 text-slate-200">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteRecord(row.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data.length === 0 && tableName && (
          <div className="bg-slate-700 rounded-lg p-8 text-center text-slate-300">
            No se encontraron datos en la tabla &quot;{tableName}&quot;
          </div>
        )}
      </div>
    </div>
  )
}
