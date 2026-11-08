'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const schema = z.object({ email: z.string().email('Enter a valid email address.') });
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isReady },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <div className={ui['auth-form-wrap']}>
      <div className={ui['auth-form-icon']}>
        <KeyRound size={21} />
      </div>
      <h2>Let’s get you back in.</h2>
      <p className={ui['auth-form-subtitle']}>
        Enter your work email to find out how to recover access to your workspace.
      </p>
      {sent ? (
        <div className={ui['forgot-success']} role="status">
          If this email belongs to a Nexus workspace, contact your organization administrator for
          password recovery. Email delivery is not configured for the local demo. Demo accounts can
          use the credentials on the sign-in page.
        </div>
      ) : (
        <form
          method="post"
          className={ui['auth-form']}
          noValidate
          onSubmit={handleSubmit(async (values) => {
            setError('');
            try {
              await api.post('/auth/forgot-password', values);
              setSent(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Please try again.');
            }
          })}
        >
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
              autoComplete="email"
              disabled={!isReady || isSubmitting}
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email && <p className={ui['form-error']}>{errors.email.message}</p>}
          </div>
          <Button type="submit" className={ui['auth-submit']} disabled={!isReady || isSubmitting}>
            {isSubmitting ? (
              <Loader2 size={15} className={'animate-spin'} />
            ) : (
              <>
                Get recovery instructions
                <ArrowRight size={15} />
              </>
            )}
          </Button>
        </form>
      )}
      <Button variant="ghost" asChild className={'mt-[22px]! pl-0!'}>
        <Link href="/login">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </Button>
    </div>
  );
}
