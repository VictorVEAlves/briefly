'use client';

import { useMemo, useState } from 'react';
import { PrimaryButton, cn } from '@/components/ui/chrome';

type NewAgentModalProps = {
  open: boolean;
  onClose: () => void;
};

const COLOR_OPTIONS = ['#a855f7', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#e5e7eb'];
const OUTPUT_TYPES = ['Texto', 'HTML', 'Markdown', 'JSON'] as const;

export function NewAgentModal({ open, onClose }: NewAgentModalProps) {
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [prompt, setPrompt] = useState('');
  const [ativoPor, setAtivoPor] = useState('manual');
  const [cor, setCor] = useState('#a855f7');
  const [tipoOutput, setTipoOutput] = useState<(typeof OUTPUT_TYPES)[number]>('Texto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const combinedInstructions = useMemo(() => {
    const chunks = [prompt.trim(), `Preferencia de output: ${tipoOutput}.`].filter(Boolean);
    return chunks.join('\n\n');
  }, [prompt, tipoOutput]);

  const reset = () => {
    setNome('');
    setEspecialidade('');
    setPrompt('');
    setAtivoPor('manual');
    setCor('#a855f7');
    setTipoOutput('Texto');
    setError(null);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-4 z-[81] flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-[rgba(8,8,15,0.98)] p-6 shadow-[0_40px_120px_-36px_rgba(0,0,0,0.9)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
                Criar novo agente
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
                Novo agente customizado
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            >
              ×
            </button>
          </div>

          {done ? (
            <div className="mt-8 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-base font-semibold text-white">Agente criado</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                O agente entra no roster do office em instantes via realtime.
              </p>
            </div>
          ) : (
            <form
              className="mt-6 space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!nome.trim() || !especialidade.trim()) return;

                setLoading(true);
                setError(null);
                try {
                  const response = await fetch('/api/agentes/contratar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nome,
                      especialidade,
                      instrucoes: combinedInstructions,
                      ativo_por: ativoPor,
                      cor,
                    }),
                  });

                  const payload = (await response.json().catch(() => ({}))) as {
                    error?: string;
                  };

                  if (!response.ok) {
                    throw new Error(payload.error ?? 'Falha ao criar agente');
                  }

                  setDone(true);
                  window.setTimeout(() => {
                    handleClose();
                  }, 1400);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Falha ao criar agente');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Field label="Nome do agente">
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-violet-300/35"
                  placeholder="SEO Specialist"
                  required
                />
              </Field>

              <Field label="Especialidade">
                <input
                  value={especialidade}
                  onChange={(event) => setEspecialidade(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-violet-300/35"
                  placeholder="Otimizacao de conteudo para buscadores"
                  required
                />
              </Field>

              <Field label="Cor do agente">
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCor(option)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border transition',
                        cor === option ? 'scale-105 border-white/70' : 'border-white/10'
                      )}
                      style={{ backgroundColor: option }}
                    >
                      {cor === option ? <span className="text-xs text-black">✓</span> : null}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Prompt do sistema (opcional)">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-[140px] w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-300/35"
                  placeholder="Voce e um especialista em SEO para ecommerce..."
                />
              </Field>

              <Field label="Tipo de output">
                <div className="grid gap-3 sm:grid-cols-4">
                  {OUTPUT_TYPES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTipoOutput(option)}
                      className={cn(
                        'rounded-2xl border px-3 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition',
                        tipoOutput === option
                          ? 'border-violet-400/35 bg-violet-500/18 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Ativado por">
                <div className="flex gap-3">
                  {['manual', 'webhook', 'calendario'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAtivoPor(option)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition',
                        ativoPor === option
                          ? 'border-violet-400/35 bg-violet-500/18 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <PrimaryButton type="submit" busy={loading}>
                  Criar agente
                </PrimaryButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
