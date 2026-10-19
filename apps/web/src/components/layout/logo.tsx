import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={ui.brand}>
      <svg viewBox="0 0 32 32" fill="none" className={ui['logo-symbol']} aria-hidden="true">
        <path d="M3 24V8l7-4v16l12-16h7v20l-7 4V12L10 28H3v-4Z" fill="currentColor" />
        <path d="m3 8 7-4v7l-7 9V8Zm19 13 7-9v12l-7 4v-7Z" fill="#c5b8ff" />
      </svg>
      {!compact && (
        <span className={ui['brand-name']}>
          nexus<span className={ui['brand-dot']}>.</span>
        </span>
      )}
    </div>
  );
}
