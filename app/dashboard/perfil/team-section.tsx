'use client'

import { useActionState } from 'react'
import {
  inviteTeamMember,
  removeTeamMember,
  type TeamState,
} from './team-actions'
import type { TeamMemberRow } from '@/lib/team-roles'
import { ROLE_LABELS } from '@/lib/team-roles'
import { Alert, Button, Field, Input } from '@/components/ui'

const initial: TeamState = { error: null, ok: false }

export function TeamSection({ members }: { members: TeamMemberRow[] }) {
  const [state, formAction, pending] = useActionState(inviteTeamMember, initial)
  const team = members.filter((m) => m.role !== 'owner')

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Invita personas de tu equipo. El rol <strong className="text-foreground">Catálogo</strong>{' '}
        solo puede editar productos; no accede a Bot Studio ni configuración crítica.
      </p>

      {team.length > 0 && (
        <ul className="divide-y divide-border rounded-card border border-border">
          {team.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">
                  {m.invited_email ?? 'Miembro'}
                </p>
                <p className="text-xs text-muted">{ROLE_LABELS[m.role]}</p>
              </div>
              <form action={removeTeamMember}>
                <input type="hidden" name="member_id" value={m.id} />
                <Button type="submit" variant="outline" size="sm">
                  Quitar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3 rounded-card border border-border bg-surface-muted p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Correo del invitado" htmlFor="team_email">
            <Input
              id="team_email"
              name="email"
              type="email"
              required
              placeholder="encargado@ejemplo.com"
            />
          </Field>
          <Field label="Rol" htmlFor="team_role">
            <select
              id="team_role"
              name="role"
              defaultValue="catalog"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="catalog">Catálogo (editar productos)</option>
              <option value="operator">Operador (conversaciones y pedidos)</option>
            </select>
          </Field>
        </div>

        {state.error && (
          <Alert tone="danger" live>
            {state.error}
          </Alert>
        )}
        {state.ok && (
          <Alert tone="success" live>
            Miembro agregado al equipo.
          </Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Invitando…' : 'Agregar al equipo'}
        </Button>
      </form>
    </div>
  )
}
