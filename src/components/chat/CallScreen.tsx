import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import type { Profile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { playRingtone, playDialTone, playConnectedBeep, playHangupTone, stopAllSounds } from '@/lib/callSounds';

interface CallScreenProps {
  roomId: string;
  userId: string;
  otherUser: Profile;
  isVideo: boolean;
  isIncoming?: boolean;
  onEnd: () => void;
}

type CallState = 'ringing' | 'connecting' | 'connected' | 'ended';

export function CallScreen({ roomId, userId, otherUser, isVideo, isIncoming, onEnd }: CallScreenProps) {
  const [state, setState] = useState<CallState>(isIncoming ? 'ringing' : 'connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!isVideo);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Play sounds based on state
  useEffect(() => {
    if (state === 'ringing' && isIncoming) {
      playRingtone();
    } else if (state === 'ringing' || state === 'connecting') {
      playDialTone();
    } else if (state === 'connected') {
      playConnectedBeep();
    } else if (state === 'ended') {
      playHangupTone();
    }
    return () => {
      if (state === 'ended') stopAllSounds();
    };
  }, [state, isIncoming]);

  const cleanup = useCallback(() => {
    stopAllSounds();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setState('connected');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      };

      const callChannel = supabase.channel(`call-${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = callChannel;

      callChannel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.from === userId) return;
        try {
          if (payload.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            callChannel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { from: userId, type: 'answer', sdp: pc.localDescription },
            });
          } else if (payload.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (payload.type === 'ice') {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else if (payload.type === 'hangup') {
            setState('ended');
            cleanup();
            setTimeout(onEnd, 1500);
          } else if (payload.type === 'accept') {
            stopAllSounds();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            callChannel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { from: userId, type: 'offer', sdp: pc.localDescription },
            });
          } else if (payload.type === 'decline') {
            setState('ended');
            cleanup();
            setTimeout(onEnd, 1500);
          }
        } catch (err) {
          console.error('Signal error:', err);
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: userId, type: 'ice', candidate: event.candidate },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setState('ended');
          cleanup();
          setTimeout(onEnd, 2000);
        }
      };

      await callChannel.subscribe();

      if (!isIncoming) {
        callChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: userId, type: 'call', isVideo, callerName: otherUser.channel_name },
        });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        callChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: userId, type: 'offer', sdp: pc.localDescription },
        });
        setState('connecting');
      }
    } catch (err) {
      console.error('Call setup error:', err);
      setState('ended');
      setTimeout(onEnd, 2000);
    }
  }, [roomId, userId, isVideo, isIncoming, cleanup, onEnd, otherUser.channel_name]);

  const acceptCall = useCallback(async () => {
    stopAllSounds();
    setState('connecting');
    await startCall();
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: userId, type: 'accept' },
    });
  }, [startCall, userId]);

  const declineCall = useCallback(() => {
    stopAllSounds();
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: userId, type: 'decline' },
    });
    setState('ended');
    cleanup();
    setTimeout(onEnd, 500);
  }, [userId, cleanup, onEnd]);

  const hangUp = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: userId, type: 'hangup' },
    });
    setState('ended');
    cleanup();
    setTimeout(onEnd, 500);
  }, [userId, cleanup, onEnd]);

  const toggleMute = () => {
    const audioTracks = localStreamRef.current?.getAudioTracks();
    if (audioTracks) {
      audioTracks.forEach(t => { t.enabled = !t.enabled; });
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    const videoTracks = localStreamRef.current?.getVideoTracks();
    if (videoTracks) {
      videoTracks.forEach(t => { t.enabled = !t.enabled; });
      setVideoOff(!videoOff);
    }
  };

  useEffect(() => {
    if (!isIncoming) startCall();
    else {
      // For incoming calls, subscribe to the channel to listen for signals
      const callChannel = supabase.channel(`call-${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = callChannel;
      callChannel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.type === 'hangup') {
          setState('ended');
          cleanup();
          setTimeout(onEnd, 1500);
        }
      });
      callChannel.subscribe();
    }
    return cleanup;
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const initials = otherUser.channel_name.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />

      {/* Animated rings for ringing/connecting */}
      {(state === 'ringing' || state === 'connecting') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-52 h-52 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '2.5s' }} />
        </div>
      )}

      {/* Remote video (full screen) */}
      {isVideo && state === 'connected' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Local video (PiP) */}
      {isVideo && !videoOff && (
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-28 h-40 rounded-xl object-cover border-2 border-border shadow-lg z-10" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {(state !== 'connected' || !isVideo) && (
          <>
            <Avatar className="w-24 h-24 mb-2 ring-4 ring-primary/20">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{otherUser.channel_name}</h2>
          </>
        )}

        <p className="text-sm text-muted-foreground">
          {state === 'ringing' && (isIncoming ? t('incomingCall') : t('calling'))}
          {state === 'connecting' && t('connecting')}
          {state === 'connected' && formatDuration(duration)}
          {state === 'ended' && t('callEnded')}
        </p>

        {state === 'ringing' && (
          <div className="flex items-center gap-2 mt-1">
            {isVideo ? <Video className="w-4 h-4 text-muted-foreground" /> : <Phone className="w-4 h-4 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground animate-pulse">
              {isVideo ? t('videoCall') : t('voiceCall')}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-12 flex items-center gap-4">
        {state === 'ringing' && isIncoming ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <Button
                size="icon"
                variant="destructive"
                className="w-14 h-14 rounded-full shadow-lg"
                onClick={declineCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <span className="text-[10px] text-muted-foreground">{t('decline')}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                size="icon"
                className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
                onClick={acceptCall}
              >
                <Phone className="w-6 h-6" />
              </Button>
              <span className="text-[10px] text-muted-foreground">{t('accept')}</span>
            </div>
          </>
        ) : state !== 'ended' ? (
          <>
            <Button
              size="icon"
              variant={muted ? 'destructive' : 'secondary'}
              className="w-12 h-12 rounded-full"
              onClick={toggleMute}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            {isVideo && (
              <Button
                size="icon"
                variant={videoOff ? 'destructive' : 'secondary'}
                className="w-12 h-12 rounded-full"
                onClick={toggleVideo}
              >
                {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="w-14 h-14 rounded-full shadow-lg"
              onClick={hangUp}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onEnd} className="rounded-full px-6">
            <X className="w-4 h-4 mr-2" /> {t('back')}
          </Button>
        )}
      </div>
    </div>
  );
}
