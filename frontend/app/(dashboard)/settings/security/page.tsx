'use client';

import { useState, useEffect } from 'react';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldCheck, ShieldOff, Key } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { getStatus, disable2FA, regenerateBackupCodes, loading } = useTwoFactor();

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  // For disable dialog
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // For regenerate dialog
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const status = await getStatus();
    if (status) {
      setIs2FAEnabled(status.enabled);
      setBackupCodesCount(status.backup_codes_remaining || 0);
    }
  };

  const handleDisable = async () => {
    try {
      await disable2FA({
        password: disablePassword,
        token: disableCode || undefined,
      });
      setShowDisable(false);
      setDisablePassword('');
      setDisableCode('');
      await loadStatus();
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateBackupCodes({
        password: regeneratePassword,
        token: regenerateCode,
      });
      if (result) {
        setNewBackupCodes(result.backup_codes);
        setRegeneratePassword('');
        setRegenerateCode('');
        await loadStatus();
      }
    } catch (err) {
      console.error('Failed to regenerate codes:', err);
    }
  };

  const downloadBackupCodes = () => {
    const codesText = newBackupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onquota-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <TwoFactorSetup
          onComplete={() => {
            setShowSetup(false);
            loadStatus();
          }}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and two-factor authentication
        </p>
      </div>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {is2FAEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className="mt-2">
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
              {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {is2FAEnabled ? (
            <>
              <Alert>
                <AlertDescription>
                  Two-factor authentication is enabled. You'll need to enter a code from your authenticator app when signing in.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Backup Codes</p>
                    <p className="text-sm text-muted-foreground">
                      {backupCodesCount} codes remaining
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerate(true)}
                >
                  Regenerate
                </Button>
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowDisable(true)}
              >
                Disable Two-Factor Authentication
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  Two-factor authentication is not enabled. Enable it to add an extra layer of security to your account.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setShowSetup(true)}>
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password and current verification code to disable 2FA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code (Optional)</label>
              <Input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisable(false);
                  setDisablePassword('');
                  setDisableCode('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={loading || !disablePassword}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerate} onOpenChange={setShowRegenerate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes.length === 0
                ? 'Enter your password and current verification code'
                : 'Save these new backup codes in a secure location'}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes.length === 0 ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Your old backup codes will no longer work after regenerating.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  type="text"
                  value={regenerateCode}
                  onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegenerate(false);
                    setRegeneratePassword('');
                    setRegenerateCode('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={loading || !regeneratePassword || regenerateCode.length !== 6}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  These codes will only be shown once. Save them in a secure location.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {newBackupCodes.map((code, index) => (
                    <code key={index} className="bg-background px-3 py-2 rounded">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadBackupCodes}
                  className="flex-1"
                >
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setShowRegenerate(false);
                    setNewBackupCodes([]);
                  }}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
