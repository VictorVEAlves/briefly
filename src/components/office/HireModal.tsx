'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ESPECIALIDADES = [
  'email_marketing',
  'whatsapp',
  'design',
  'clickup',
  'briefing',
  'seo',
  'copywriting',
  'analytics',
];

const ATIVADO_POR = [
  { value: 'manual', label: 'Manual' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'calendario', label: 'Calendário' },
];

export default function HireModal({ open, onClose }: Props) {
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('copywriting');
  const [instrucoes, setInstrucoes] = useState('');
  const [ativoPor, setAtivoPor] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agentes/contratar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, especialidade, instrucoes, ativo_por: ativoPor }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(data.error ?? 'Falha ao contratar agente');
      }

      setDone(true);
      setTimeout(() => {
        setDone(false);
        setNome('');
        setInstrucoes('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contratar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 101,
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(18,14,10,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
              Contratar
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f0ece4', margin: 0, letterSpacing: '-0.03em' }}>
              Novo Agente
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <p style={{ color: '#2ed769', fontFamily: 'monospace', fontSize: 12 }}>Agente contratado!</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 6 }}>Aparece no escritório em instantes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nome do agente">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Analytics Expert"
                required
                style={inputStyle}
              />
            </Field>

            <Field label="Especialidade">
              <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} style={inputStyle}>
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </Field>

            <Field label="Instruções (opcional)">
              <textarea
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                placeholder="Descreva o que esse agente deve fazer..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </Field>

            <Field label="Ativado por">
              <div style={{ display: 'flex', gap: 8 }}>
                {ATIVADO_POR.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAtivoPor(opt.value)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: ativoPor === opt.value ? 'rgba(232,82,26,0.6)' : 'rgba(255,255,255,0.1)',
                      background: ativoPor === opt.value ? 'rgba(232,82,26,0.15)' : 'transparent',
                      color: ativoPor === opt.value ? '#f0a060' : 'rgba(255,255,255,0.45)',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {error && (
              <p style={{ color: '#f06060', fontFamily: 'monospace', fontSize: 11, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !nome.trim()}
              style={{
                marginTop: 4,
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: loading ? 'rgba(232,82,26,0.4)' : 'linear-gradient(135deg,#e0261f,#a01010)',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {loading ? 'Contratando...' : 'Contratar agente'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f0ece4',
  fontFamily: 'monospace',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};
