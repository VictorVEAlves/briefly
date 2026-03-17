'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PrimaryButton,
  SectionCard,
  StatePanel,
  cn,
} from '@/components/ui/chrome';
import type { Canal, Tom } from '@/types/campanha';

const briefingSchema = z.object({
  nome: z.string().min(3, 'Nome da campanha deve ter ao menos 3 caracteres'),
  periodo_inicio: z.string().min(1, 'Data de inicio obrigatoria'),
  periodo_fim: z.string().min(1, 'Data de fim obrigatoria'),
  produto_destaque: z.string().min(2, 'Produto em destaque obrigatorio'),
  url_produto: z.string().url('URL invalida').optional().or(z.literal('')),
  produtos_secundarios: z.string().optional(),
  desconto_pix: z.number().min(0).max(100).optional(),
  desconto_cartao: z.number().min(0).max(100).optional(),
  parcelamento: z.string().optional(),
  cupom: z.string().optional(),
  publico: z.array(z.string()).min(1, 'Selecione ao menos um publico'),
  listas_whatsapp: z.array(z.string()).optional(),
  canais: z
    .array(z.enum(['email', 'whatsapp', 'instagram_feed', 'instagram_stories']))
    .min(1, 'Selecione ao menos um canal'),
  tom: z.enum(['urgencia', 'autoridade', 'educativo', 'celebracao'], {
    required_error: 'Selecione o tom da campanha',
  }),
  mensagem_central: z.string().optional(),
  argumento_principal: z.string().optional(),
});

type FormValues = z.infer<typeof briefingSchema>;

type ChoiceOption = {
  value: string;
  label: string;
  description: string;
  meta?: string;
};

const PUBLICO_OPTIONS: ChoiceOption[] = [
  { value: 'profissional_pdr', label: 'Profissional PDR', description: 'Oferta voltada para quem ja opera no mercado e precisa de giro rapido.', meta: 'B2B' },
  { value: 'iniciante', label: 'Iniciante', description: 'Mensagem mais didatica para quem esta entrando no universo PDR.', meta: 'Educacao' },
  { value: 'granizo', label: 'Granizo', description: 'Campanhas com senso de urgencia para demanda sazonal e reparo rapido.', meta: 'Sazonal' },
  { value: 'revendedor', label: 'Revendedor', description: 'Foco em margem, mix e argumento comercial para parceiros.', meta: 'Canal' },
];

const LISTAS_WHATSAPP: ChoiceOption[] = [
  { value: 'grupo_vip', label: 'Grupo VIP', description: 'Base mais aquecida, ideal para lancamentos e ofertas com escassez.', meta: 'Alta intencao' },
  { value: 'tallos', label: 'Tallos', description: 'Lista operacional ja usada nas campanhas de rotina.', meta: 'Recorrencia' },
  { value: 'base_geral', label: 'Base geral', description: 'Distribuicao ampla para volume e alcance de marca.', meta: 'Escala' },
];

const CANAIS_OPTIONS: Array<ChoiceOption & { value: Canal }> = [
  { value: 'email', label: 'Email marketing', description: 'Entrega um email pronto para revisao com assunto, preview e HTML.', meta: 'Long form' },
  { value: 'whatsapp', label: 'WhatsApp', description: 'Gera mensagens segmentadas por lista com tom comercial rapido.', meta: 'Conversao' },
  { value: 'instagram_feed', label: 'Instagram feed', description: 'Cria arte 1080x1080 com CTA pensado para descoberta e prova social.', meta: 'Visual' },
  { value: 'instagram_stories', label: 'Instagram stories', description: 'Entrega criativo 1080x1920 com leitura rapida e urgencia.', meta: 'Stories' },
];

const TOM_OPTIONS: Array<ChoiceOption & { value: Tom }> = [
  { value: 'urgencia', label: 'Urgencia', description: 'Aciona escassez, prazo curto e decisao imediata.', meta: 'Push' },
  { value: 'autoridade', label: 'Autoridade', description: 'Reforca expertise, resultado e lideranca de categoria.', meta: 'Trust' },
  { value: 'educativo', label: 'Educativo', description: 'Explica a oferta e valoriza argumento racional.', meta: 'Clareza' },
  { value: 'celebracao', label: 'Celebracao', description: 'Cria clima positivo de marco, bonus ou comemoracao.', meta: 'Brand' },
];

const optionalNumberField = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
};

function Field({
  label,
  note,
  hint,
  error,
  children,
}: {
  label: string;
  note?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="field-label">
          <span>{label}</span>
          {note ? <span className="field-label-note">{note}</span> : null}
        </label>
      </div>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function ChoiceCard({
  option,
  selected,
  kind,
  onChange,
}: {
  option: ChoiceOption;
  selected: boolean;
  kind: 'checkbox' | 'radio';
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'group flex min-h-[150px] cursor-pointer flex-col justify-between rounded-[24px] border p-4 transition duration-200',
        selected
          ? 'border-[var(--color-primary)] bg-[linear-gradient(135deg,var(--color-primary-soft),rgba(255,255,255,0.96))] shadow-[0_22px_45px_-32px_rgba(224,38,31,0.7)]'
          : 'border-[var(--color-border)] bg-white/72 hover:border-[var(--color-border-strong)] hover:bg-white'
      )}
    >
      <input type={kind} className="sr-only" checked={selected} onChange={onChange} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold tracking-[-0.03em] text-[var(--color-text)]">{option.label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{option.description}</p>
        </div>
        <span
          className={cn(
            'mt-1 flex h-6 w-6 shrink-0 items-center justify-center border transition',
            kind === 'radio' ? 'rounded-full' : 'rounded-lg',
            selected
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
              : 'border-[var(--color-border-strong)] bg-white'
          )}
        >
          <span
            className={cn(
              'block h-2.5 w-2.5 transition',
              kind === 'radio' ? 'rounded-full' : 'rounded-[3px]',
              selected ? 'scale-100 bg-white' : 'scale-0 bg-transparent'
            )}
          />
        </span>
      </div>
      {option.meta ? (
        <div className="mt-4">
          <span className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-white/75 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            {option.meta}
          </span>
        </div>
      ) : null}
    </label>
  );
}

function MultiChoiceGrid({
  options,
  selected,
  onChange,
}: {
  options: ChoiceOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    );
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          option={option}
          selected={selected.includes(option.value)}
          kind="checkbox"
          onChange={() => toggle(option.value)}
        />
      ))}
    </div>
  );
}

function SingleChoiceGrid({
  options,
  selected,
  onChange,
}: {
  options: ChoiceOption[];
  selected?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          option={option}
          selected={selected === option.value}
          kind="radio"
          onChange={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CampaignModal({ open, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(briefingSchema),
    defaultValues: { publico: [], canais: [], listas_whatsapp: [] },
  });

  const publico = watch('publico') ?? [];
  const canais = watch('canais') ?? [];
  const listasWhatsapp = watch('listas_whatsapp') ?? [];
  const tom = watch('tom');

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/campanha/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error ?? 'Falha ao criar campanha');
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        reset();
        onClose();
      }, 1500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao enviar formulario');
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(6px)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          inset: 16,
          maxWidth: 760,
          margin: '0 auto',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px -24px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'rgba(12,10,7,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
              Briefly
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f0ece4', letterSpacing: '-0.02em' }}>
              Nova campanha
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 22,
              lineHeight: 1,
              padding: '4px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--color-background)',
          }}
        >
          {success ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 300 }}>
              <StatePanel
                tone="success"
                icon="OK"
                title="Campanha criada"
                description="Os agentes foram acionados e vao trabalhar em tempo real."
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
              {/* 01 / Identidade */}
              <SectionCard
                eyebrow="01 / Identidade"
                title="Contexto base da campanha"
                description="Defina o nome e a janela da campanha para alinhar criacao, revisao e operacao."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Nome da campanha" note="Obrigatorio" error={errors.nome?.message}>
                      <input
                        {...register('nome')}
                        type="text"
                        placeholder="Ex: Campanha granizo Q2"
                        className="field-input"
                        aria-invalid={Boolean(errors.nome)}
                      />
                    </Field>
                  </div>
                  <Field label="Data de inicio" note="Obrigatorio" error={errors.periodo_inicio?.message}>
                    <input
                      {...register('periodo_inicio')}
                      type="date"
                      className="field-input"
                      aria-invalid={Boolean(errors.periodo_inicio)}
                    />
                  </Field>
                  <Field label="Data de fim" note="Obrigatorio" error={errors.periodo_fim?.message}>
                    <input
                      {...register('periodo_fim')}
                      type="date"
                      className="field-input"
                      aria-invalid={Boolean(errors.periodo_fim)}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* 02 / Produto */}
              <SectionCard
                eyebrow="02 / Produto"
                title="Oferta principal e apoio visual"
                description="O agente usa esse contexto para puxar argumento de venda, ativos e referencia de produto."
              >
                <div className="space-y-5">
                  <Field label="Produto em destaque" note="Obrigatorio" error={errors.produto_destaque?.message}>
                    <input
                      {...register('produto_destaque')}
                      type="text"
                      placeholder="Ex: Kit PDR profissional completo"
                      className="field-input"
                      aria-invalid={Boolean(errors.produto_destaque)}
                    />
                  </Field>
                  <Field label="URL do produto" hint="Se informado, o fluxo pode aproveitar a pagina para extrair referencia visual." error={errors.url_produto?.message}>
                    <input
                      {...register('url_produto')}
                      type="url"
                      placeholder="https://www.fastpdrtools.com.br/produto/..."
                      className="field-input"
                      aria-invalid={Boolean(errors.url_produto)}
                    />
                  </Field>
                  <Field label="Produtos secundarios" hint="Opcional para bundles, upsell ou argumento complementar.">
                    <input
                      {...register('produtos_secundarios')}
                      type="text"
                      placeholder="Ex: Ventosa profissional, cola quente, luz de inspecao"
                      className="field-input"
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* 03 / Promocao */}
              <SectionCard
                eyebrow="03 / Promocao"
                title="Condicoes comerciais"
                description="Esse bloco e opcional, mas ajuda a dar mais precisao para CTA, headline e senso de oportunidade."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Desconto PIX" hint="Percentual" error={errors.desconto_pix?.message}>
                    <input
                      {...register('desconto_pix', optionalNumberField)}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="15"
                      className="field-input"
                      aria-invalid={Boolean(errors.desconto_pix)}
                    />
                  </Field>
                  <Field label="Desconto cartao" hint="Percentual" error={errors.desconto_cartao?.message}>
                    <input
                      {...register('desconto_cartao', optionalNumberField)}
                      type="number"
                      min={0}
                      max={100}
                      placeholder="10"
                      className="field-input"
                      aria-invalid={Boolean(errors.desconto_cartao)}
                    />
                  </Field>
                  <Field label="Parcelamento em destaque">
                    <input
                      {...register('parcelamento')}
                      type="text"
                      placeholder="Ex: 12x sem juros"
                      className="field-input"
                    />
                  </Field>
                  <Field label="Cupom">
                    <input
                      {...register('cupom')}
                      type="text"
                      placeholder="Ex: PDR10"
                      className="field-input"
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* 04 / Publico */}
              <SectionCard
                eyebrow="04 / Publico"
                title="Segmentacao e listas"
                description="Combine segmento, momento e base de disparo para reduzir ruido e melhorar a conversao."
              >
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <p className="field-label">
                        <span>Segmento</span>
                        <span className="field-label-note">Obrigatorio</span>
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Escolha um ou mais perfis que receberao a narrativa principal.
                      </p>
                    </div>
                    <MultiChoiceGrid
                      options={PUBLICO_OPTIONS}
                      selected={publico}
                      onChange={(values) => setValue('publico', values, { shouldDirty: true, shouldValidate: true })}
                    />
                    {errors.publico?.message ? <p className="field-error">{errors.publico.message}</p> : null}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="field-label">Listas de WhatsApp</p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Selecione as bases que vao receber mensagens quando o canal estiver ativo.
                      </p>
                    </div>
                    <MultiChoiceGrid
                      options={LISTAS_WHATSAPP}
                      selected={listasWhatsapp}
                      onChange={(values) => setValue('listas_whatsapp', values, { shouldDirty: true })}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* 05 / Canais */}
              <SectionCard
                eyebrow="05 / Canais"
                title="Mix de distribuicao"
                description="O Briefly gera apenas os outputs selecionados aqui. A combinacao define o pacote de entrega."
              >
                <div className="space-y-3">
                  <MultiChoiceGrid
                    options={CANAIS_OPTIONS}
                    selected={canais}
                    onChange={(values) => setValue('canais', values as Canal[], { shouldDirty: true, shouldValidate: true })}
                  />
                  {errors.canais?.message ? <p className="field-error">{errors.canais.message}</p> : null}
                </div>
              </SectionCard>

              {/* 06 / Conteudo */}
              <SectionCard
                eyebrow="06 / Conteudo"
                title="Tom, mensagem e argumento"
                description="Defina a postura da campanha para que os agentes cheguem mais perto do resultado na primeira passada."
              >
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <p className="field-label">
                        <span>Tom da campanha</span>
                        <span className="field-label-note">Obrigatorio</span>
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Esse ajuste muda CTA, headline e narrativa em todos os canais.
                      </p>
                    </div>
                    <SingleChoiceGrid
                      options={TOM_OPTIONS}
                      selected={tom}
                      onChange={(value) => setValue('tom', value as Tom, { shouldDirty: true, shouldValidate: true })}
                    />
                    {errors.tom?.message ? <p className="field-error">{errors.tom.message}</p> : null}
                  </div>

                  <div className="grid gap-5">
                    <Field label="Mensagem central" hint="Resumo rapido da promessa principal da campanha.">
                      <input
                        {...register('mensagem_central')}
                        type="text"
                        placeholder="Ex: Economize ate 20% no melhor kit PDR do Brasil"
                        className="field-input"
                      />
                    </Field>
                    <Field label="Argumento principal" hint="Use esse campo para reforcar prova, objecao ou beneficio central.">
                      <textarea
                        {...register('argumento_principal')}
                        rows={4}
                        placeholder="Descreva o argumento de venda que precisa aparecer em todo o pacote..."
                        className="field-input min-h-[140px] resize-y"
                      />
                    </Field>
                  </div>
                </div>
              </SectionCard>

              {submitError ? (
                <StatePanel
                  tone="danger"
                  icon="ER"
                  title="Nao foi possivel iniciar a campanha"
                  description={submitError}
                />
              ) : null}

              {/* Submit row */}
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(17,20,27,0.96)] p-5 text-[var(--color-text-inverse)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/55">
                  Proximo passo
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em]">
                  Iniciar automacao da campanha
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  O envio cria briefing, outputs e contexto de aprovacao sem alterar seu back-end atual.
                </p>
                <PrimaryButton type="submit" busy={isSubmitting} className="mt-5 w-full">
                  {isSubmitting ? 'Iniciando campanha...' : 'Iniciar campanha'}
                </PrimaryButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
