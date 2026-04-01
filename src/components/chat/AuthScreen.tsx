import React, { useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthScreenProps {
  onSignUp: (email: string, password: string, channelName: string) => Promise<any>;
  onSignIn: (email: string, password: string) => Promise<any>;
  onGuest?: () => void;
}

export function AuthScreen({ onSignUp, onSignIn, onGuest }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!channelName.trim()) { toast.error('Username is required'); setLoading(false); return; }
        await onSignUp(email, password, channelName.trim());
        toast.success('Account created!');
      } else {
        await onSignIn(email, password);
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('welcome')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('welcomeSub')}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="channelName" className="text-xs font-medium">{t('channelName')}</Label>
                <Input id="channelName" value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="koma_user" required className="h-10" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">{t('password')}</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-10" />
            </div>
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? t('login') : t('signup')}
            </Button>
          </form>
          {onGuest && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
          )}
          {onGuest && (
            <Button variant="outline" className="w-full h-10" onClick={onGuest}>
              Continue as Guest
            </Button>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
          >
            {mode === 'login' ? t('needAccount') : t('haveAccount')}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
