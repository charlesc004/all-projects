import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={ui['auth-page']}>
      <aside className={ui['auth-story']}>
        <Logo />
        <div className={ui['auth-story-content']}>
          <span className={ui['auth-eyebrow']}>
            <Sparkles size={11} />
            YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h1>
            Great relationships.
            <br />
            Extraordinary
            <br />
            <span>possibilities.</span>
          </h1>
          <p>
            A little less busywork. A lot more connection.
            <br />
            Bring your people, pipeline, and possibilities together in one thoughtful workspace.
          </p>
          <div className={ui['auth-feature']}>
            <CheckCircle2 size={15} />
            Every relationship, in the right place.
          </div>
          <div className={ui['auth-feature']}>
            <CheckCircle2 size={15} />A clearer path from first hello to closed deal.
          </div>
          <div className={ui['auth-feature']}>
            <CheckCircle2 size={15} />
            Your team, always moving forward.
          </div>
          <div className={ui['auth-quote']}>
            <p>“The best customer experiences begin with a team that has the whole picture.”</p>
            <div className={ui['auth-quote-user']}>
              <span className={cn(ui.avatar, 'bg-[#302c45]! text-[#c8b4df]!')}>N</span>
              <span>
                The Nexus philosophy<small>Made for people who build relationships.</small>
              </span>
            </div>
          </div>
        </div>
        <span className={ui['auth-story-footer']}>
          © {new Date().getFullYear()} Nexus CRM · Thoughtfully connected.
        </span>
      </aside>
      <main className={ui['auth-form-side']}>
        <div className={ui['auth-mobile-brand']}>
          <Logo />
        </div>
        {children}
        <div className={ui['auth-form-footer']}>
          <LockKeyhole size={10} className={'inline! mr-[5px]! [vertical-align:middle]!'} />
          Your workspace. Your relationships. Securely together.
        </div>
      </main>
    </div>
  );
}
