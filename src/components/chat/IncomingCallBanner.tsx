import React, { useEffect } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { playRingtone, stopAllSounds } from '@/lib/callSounds';
import type { Profile } from '@/hooks/useAuth';

interface IncomingCallBannerProps {
  callerProfile: Profile;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallBanner({ callerProfile, isVideo, onAccept, onDecline }: IncomingCallBannerProps) {
  useEffect(() => {
    playRingtone();
    return () => stopAllSounds();
  }, []);

  const initials = callerProfile.channel_name.slice(0, 2).toUpperCase();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-primary/30">
              <AvatarImage src={callerProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{callerProfile.channel_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isVideo ? <Video className="w-3 h-3 text-muted-foreground" /> : <Phone className="w-3 h-3 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground animate-pulse">
                {t('incomingCall')} — {isVideo ? t('videoCall') : t('voiceCall')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1 h-10 rounded-xl gap-2"
            onClick={onDecline}
          >
            <PhoneOff className="w-4 h-4" />
            {t('decline')}
          </Button>
          <Button
            className="flex-1 h-10 rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={onAccept}
          >
            <Phone className="w-4 h-4" />
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
