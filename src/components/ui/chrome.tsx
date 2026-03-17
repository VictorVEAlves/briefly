import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type AppShellProps = {
  children: ReactNode;
  action?: ReactNode;
};

export function AppShell({ children, action }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(224,38,31,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(208,139,92,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.48),rgba(242,239,232,0.94))]" />
      <div className="bg-grid-overlay pointer-events-none absolute inset-0 opacity-70" />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border-strong)] bg-[rgba(12,14,19,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/briefing" className="group flex items-center gap-3 text-[var(--color-text-inverse)]">
            <BrandMark />
            <div>
              <p className="text-base font-semibold tracking-[0.14em]">BRIEFLY</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">
                Fast PDR Tools
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {action ?? (
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/70 sm:inline-flex">
                Campaign OS
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] shadow-[0_20px_45px_-28px_rgba(224,38,31,0.8)]">
      <span className="absolute h-5 w-5 -translate-x-[5px] -translate-y-[5px] rounded-md bg-[var(--color-primary)]" />
      <span className="absolute h-4 w-4 translate-x-[6px] translate-y-[5px] rounded-full border border-white/60 bg-white/10" />
      <span className="absolute h-2 w-2 rounded-full bg-white" />
    </span>
  );
}

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  aside?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  badges = [],
  aside,
}: PageHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_340px]">
        <div className="panel-surface relative overflow-hidden rounded-[32px] border border-white/70 px-6 py-8 motion-safe:animate-fade-up sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(224,38,31,0.65),transparent)]" />
          <div className="pointer-events-none absolute -right-24 top-0 h-56 w-56 rounded-full bg-[rgba(224,38,31,0.08)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-[rgba(26,31,44,0.06)] blur-3xl" />

          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
            {description}
          </p>

          {badges.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {badges.map((badge) => (
                <MetaPill key={badge}>{badge}</MetaPill>
              ))}
            </div>
          )}
        </div>

        {aside ? <div className="grid gap-4">{aside}</div> : null}
      </div>
    </section>
  );
}

type SectionCardProps = {
  title: string;
  children: ReactNode;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  children,
  eyebrow,
  description,
  action,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <section className={cn('panel-surface rounded-[28px] border border-white/70 p-5 sm:p-6', className)}>
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn('pt-6', contentClassName)}>{children}</div>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: 'light' | 'dark';
};

export function MetricCard({
  label,
  value,
  detail,
  tone = 'dark',
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[26px] border p-5 shadow-[0_18px_45px_-30px_rgba(17,24,39,0.32)] backdrop-blur',
        tone === 'dark'
          ? 'border-white/10 bg-[linear-gradient(180deg,rgba(17,20,27,0.94),rgba(12,14,19,0.9))] text-[var(--color-text-inverse)]'
          : 'border-[var(--color-border)] bg-white/72 text-[var(--color-text)]'
      )}
    >
      <p
        className={cn(
          'font-mono text-[11px] uppercase tracking-[0.28em]',
          tone === 'dark' ? 'text-white/55' : 'text-[var(--color-text-muted)]'
        )}
      >
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{value}</p>
      {detail ? (
        <p
          className={cn(
            'mt-2 text-sm leading-6',
            tone === 'dark' ? 'text-white/70' : 'text-[var(--color-text-muted)]'
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

const STATUS_STYLES: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  rascunho: {
    label: 'Rascunho',
    className:
      'border-slate-300/80 bg-slate-100/90 text-slate-700',
  },
  iniciado: {
    label: 'Em andamento',
    className:
      'border-amber-300/80 bg-amber-50 text-amber-700',
  },
  gerando: {
    label: 'Gerando',
    className:
      'border-amber-300/80 bg-amber-50 text-amber-700',
  },
  em_revisao: {
    label: 'Em revisao',
    className:
      'border-sky-300/80 bg-sky-50 text-sky-700',
  },
  pronto: {
    label: 'Pronto',
    className:
      'border-sky-300/80 bg-sky-50 text-sky-700',
  },
  concluido: {
    label: 'Concluido',
    className:
      'border-emerald-300/80 bg-emerald-50 text-emerald-700',
  },
  aprovado: {
    label: 'Aprovado',
    className:
      'border-emerald-300/80 bg-emerald-50 text-emerald-700',
  },
  aprovada: {
    label: 'Aprovada',
    className:
      'border-emerald-300/80 bg-emerald-50 text-emerald-700',
  },
  erro: {
    label: 'Erro',
    className:
      'border-rose-300/80 bg-rose-50 text-rose-700',
  },
  pendente: {
    label: 'Pendente',
    className:
      'border-slate-300/80 bg-slate-100/90 text-slate-600',
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const resolved = STATUS_STYLES[status] ?? STATUS_STYLES.pendente;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em]',
        resolved.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? resolved.label}
    </span>
  );
}

type StatePanelProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const STATE_STYLES: Record<
  NonNullable<StatePanelProps['tone']>,
  {
    frame: string;
    icon: string;
    text: string;
  }
> = {
  neutral: {
    frame: 'border-[var(--color-border)] bg-white/70',
    icon: 'bg-[rgba(17,24,39,0.08)] text-[var(--color-text)]',
    text: 'text-[var(--color-text-muted)]',
  },
  success: {
    frame: 'border-emerald-200 bg-emerald-50/90',
    icon: 'bg-emerald-600 text-white',
    text: 'text-emerald-700',
  },
  warning: {
    frame: 'border-amber-200 bg-amber-50/90',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-700',
  },
  danger: {
    frame: 'border-rose-200 bg-rose-50/90',
    icon: 'bg-rose-600 text-white',
    text: 'text-rose-700',
  },
};

export function StatePanel({
  title,
  description,
  tone = 'neutral',
  action,
  icon,
  className,
}: StatePanelProps) {
  const style = STATE_STYLES[tone];

  return (
    <div className={cn('rounded-[24px] border p-5 sm:p-6', style.frame, className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold',
              style.icon
            )}
          >
            {icon ?? '01'}
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text)]">
              {title}
            </h3>
            <p className={cn('mt-2 text-sm leading-6', style.text)}>{description}</p>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
};

export function PrimaryButton({
  busy = false,
  className,
  children,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] px-5 py-4 text-sm font-semibold text-white shadow-[0_24px_55px_-30px_rgba(224,38,31,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_65px_-30px_rgba(224,38,31,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
        className
      )}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white/72 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin text-current', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M12 2a10 10 0 0 0-9.95 9H6a6 6 0 0 1 6-5.95V2Z"
      />
    </svg>
  );
}
