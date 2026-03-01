'use client';
// app/componentes/BusinessAppealModal.tsx
// Modal para que el dueño del negocio apele un bloqueo

import { useState } from 'react';
import { X, Send, Lock, AlertTriangle, ShieldAlert } from 'lucide-react';

const API = 'https://vercel-backend-ochre-nine.vercel.app/api';

interface Props {
  businessId: string;
  businessName: string;
  blockedReason?: string;
  token: string;
  onClose: () => void;
  onSuccess: (updated: { appealStatus: string; appealNote: string }) => void;
}

export default function BusinessAppealModal({
  businessId,
  businessName,
  blockedReason,
  token,
  onClose,
  onSuccess,
}: Props) {
  const [appealNote, setAppealNote] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    if (!appealNote.trim()) { setError('Escribí al menos una explicación.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/business/${businessId}/appeal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appealNote: appealNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar la apelación');
      onSuccess({ appealStatus: 'pending', appealNote: appealNote.trim() });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1c1210',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 16,
          padding: '1.5rem',
          maxWidth: 460,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{
            margin: 0, color: '#fca5a5', fontSize: '0.95rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ShieldAlert size={17} /> Apelar bloqueo del negocio
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info del bloqueo */}
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10,
          padding: '0.85rem 1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.35rem' }}>
            <Lock size={14} style={{ color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.88rem' }}>{businessName}</span>
          </div>
          {blockedReason && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(252,165,165,0.65)', lineHeight: 1.5 }}>
              Motivo del bloqueo: <em>{blockedReason}</em>
            </p>
          )}
        </div>

        {/* Aviso */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, padding: '0.7rem 0.9rem',
        }}>
          <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(253,186,116,0.8)', lineHeight: 1.55 }}>
            El equipo revisará tu apelación y te notificará la decisión. Tu negocio seguirá inactivo mientras la revisión está en curso.
          </p>
        </div>

        {/* Textarea */}
        <div>
          <label style={{
            display: 'block', fontSize: '0.73rem', fontWeight: 700,
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: '0.4rem',
          }}>
            Tu mensaje al equipo de moderación
          </label>
          <textarea
            value={appealNote}
            onChange={e => setAppealNote(e.target.value)}
            placeholder="Explicá por qué creés que el bloqueo fue incorrecto o qué cambios hiciste para cumplir con las políticas..."
            rows={5}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 10,
              color: '#fff',
              padding: '0.65rem 0.85rem',
              fontSize: '0.83rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
            {appealNote.length}/1000 caracteres
          </p>
        </div>

        {/* Error */}
        {error && (
          <p style={{
            margin: 0, fontSize: '0.78rem', color: '#f87171', fontWeight: 600,
            background: 'rgba(239,68,68,0.1)', padding: '0.5rem 0.75rem',
            borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {error}
          </p>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.6)',
              fontSize: '0.83rem', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !appealNote.trim()}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
              background: saving || !appealNote.trim()
                ? 'rgba(239,68,68,0.25)'
                : 'linear-gradient(135deg,#ef4444,#dc2626)',
              color: '#fff', fontSize: '0.83rem', fontWeight: 700,
              cursor: saving || !appealNote.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <Send size={13} />
            {saving ? 'Enviando...' : 'Enviar apelación'}
          </button>
        </div>
      </div>
    </div>
  );
}