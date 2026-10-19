'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, FlaskConical, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
type Values = z.infer<typeof schema>;
export default function LoginPage() {
  const router = useRouter();
  const client = useQueryClient();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState('admin');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isReady },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@nexus.demo', password: 'NexusDemo!2026' },
  });
  async function submit(values: Values) {
    setError('');
    try {
      const result = await api.post('/auth/login', values);
      await client.cancelQueries();
      client.clear();
      client.setQueryData(['auth'], result);
      router.replace('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    }
  }
  return (
    <div className={ui['auth-form-wrap']}>
      <div className={ui['auth-form-icon']}>
        <LogIn size={20} />
      </div>
      <h2>A good day to connect.</h2>
      <p className={ui['auth-form-subtitle']}>Welcome back. Sign in to your Nexus workspace.</p>
      <form method="post" className={ui['auth-form']} onSubmit={handleSubmit(submit)} noValidate>
        {error && (
          <div className={ui['auth-error']} role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className={ui['form-label']}>
            Work email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            disabled={!isReady || isSubmitting}
            placeholder="you@company.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className={ui['form-error']}>{errors.email.message}</p>}
        </div>
        <div>
          <div className={ui['auth-label-row']}>
            <label htmlFor="password" className={ui['form-label']}>
              Password
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <div className={ui['password-input']}>
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={!isReady || isSubmitting}
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              className={ui['password-toggle']}
              disabled={!isReady}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className={ui['form-error']}>{errors.password.message}</p>}
        </div>
        <Button type="submit" className={ui['auth-submit']} disabled={!isReady || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className={'animate-spin'} size={16} />
          ) : (
            <>
              Sign in to workspace
              <ArrowRight size={15} className={'ml-auto!'} />
            </>
          )}
        </Button>
      </form>
      <div className={ui['demo-panel']}>
        <div className={ui['demo-panel-title']}>
          <FlaskConical size={13} />
          EXPLORE THE LOCAL DEMO
        </div>
        <p>
          A fully connected CRM, ready to explore.
          <br />
          Choose a role. Demo credentials are filled in for you.
        </p>
        <div className={ui['demo-accounts']}>
          {[
            ['admin', 'Administrator'],
            ['manager', 'Manager'],
            ['sales', 'Sales rep'],
          ].map(([value, title]) => (
            <button
              type="button"
              className={demo === value ? ui.selected : ''}
              key={value}
              disabled={!isReady || isSubmitting}
              onClick={() => {
                setDemo(value);
                setValue('email', `${value}@nexus.demo`);
                setValue('password', 'NexusDemo!2026');
              }}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      <div className={ui['auth-security']}>
        <ShieldCheck size={12} />
        Protected by secure, HttpOnly sessions
      </div>
    </div>
  );
}
