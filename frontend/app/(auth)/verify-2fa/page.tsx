'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyLogin, loading, error } = useTwoFactor();

  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    // Get email from URL params (passed from login page)
    const emailParam = searchParams.get('email');
    if (!emailParam) {
      // If no email, redirect back to login
      router.push('/login');
    } else {
      setEmail(emailParam);
    }
  }, [searchParams, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !email) {
      return;
    }

    try {
      await verifyLogin({ email, token: code });
      // On success, redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Verification failed:', err);
      // Error is handled by the hook
    }
  };

  const handleCodeChange = (value: string) => {
    // Remove non-digits and limit length
    const cleaned = value.replace(/\D/g, '');
    const maxLength = useBackupCode ? 8 : 6;
    setCode(cleaned.slice(0, maxLength));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              Two-Factor Authentication
            </CardTitle>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          </div>
          <CardDescription>
            Enter the {useBackupCode ? '8-digit backup code' : '6-digit code'} from your authenticator app
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {useBackupCode ? 'Backup Code' : 'Verification Code'}
              </label>
              <Input
                type="text"
                placeholder={useBackupCode ? '00000000' : '000000'}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground text-center">
                {email && `Verifying for ${email}`}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length < (useBackupCode ? 8 : 6)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode('');
                }}
                className="text-sm"
              >
                {useBackupCode
                  ? 'Use authenticator code instead'
                  : 'Use a backup code'}
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Lost your authenticator device?</strong>
                <br />
                Use one of your backup codes to access your account. Each backup code can only be used once.
              </AlertDescription>
            </Alert>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
