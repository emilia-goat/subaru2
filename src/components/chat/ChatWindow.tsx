import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './MessageBubble';
import { ChatSettings } from './ChatSettings';
import { CallScreen } from './CallScreen';
import { GifPicker } from './GifPicker';
import { Send, Image, Mic, MicOff, ArrowUp, WifiOff, Menu, Settings, Phone, Video, X, Smile } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage, Room } from '@/hooks/useChat';
import type { Profile } from '@/hooks/useAuth';

type BubbleStyle = 'rounded' | 'square' | 'pill';
type ChatTextSize = 'small' | 'normal' | 'large';

interface ChatUiSettings {
  bubbleStyle: BubbleStyle;
  textSize: ChatTextSize;
  compactMode: boolean;
  chatBackground: string;
}

const DEFAULT_CHAT_UI: ChatUiSettings = { bubbleStyle: 'rounded', textSize: 'normal', compactMode: false, chatBackground: '' };

function parseChatUiSettings(raw: string | null): ChatUiSettings {
  if (!raw) return DEFAULT_CHAT_UI;
  try {
    const p = JSON.parse(raw) as Partial<ChatUiSettings>;
    return {
      bubbleStyle: (['square','pill'].includes(p.bubbleStyle as string) ? p.bubbleStyle : 'rounded') as BubbleStyle,
      textSize: (['small','large'].includes(p.textSize as string) ? p.textSize : 'normal') as ChatTextSize,
      compactMode: Boolean(p.compactMode),
      chatBackground: (p.chatBackground as string) || '',
    };
  } catch { return DEFAULT_CHAT_UI; }
}

interface ChatWindowProps {
  room: Room | undefined;
  messages: ChatMessage[];
  typingUsers: Map<string, Profile>;
  userId: string;
  loadingMessages: boolean;
  hasMore: boolean;
  connectionLost: boolean;
  globalRoomId: string;
  onSend: (content?: string, mediaUrl?: string, mediaType?: string, replyTo?: string) => Promise<void>;
  onUpload: (file: File) => Promise<{ url: string; type: 'image' | 'voice' }>;
  onTyping: () => void;
  onLoadMore: () => void;
  onToggleSidebar: () => void;
  onDelete: (messageId: string) => Promise<void>;
  profile?: Profile | null;
  isGuest?: boolean;
  onUpdateProfile?: (updates: { channel_name?: string; avatar_url?: string | null; bio?: string }) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
}

export function ChatWindow({
  room, messages, typingUsers, userId,
  loadingMessages, hasMore, connectionLost, globalRoomId,
  onSend, onUpload, onTyping, onLoadMore, onToggleSidebar, onDelete,
  profile, isGuest, onUpdateProfile, onUploadAvatar,
}: ChatWindowProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [chatUiSettings, setChatUiSettings] = useState<ChatUiSettings>(DEFAULT_CHAT_UI);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshSettings = useCallback(() => {
    setChatUiSettings(parseChatUiSettings(localStorage.getItem('koma_chat_settings')));
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  useEffect(() => {
    refreshSettings();
    window.addEventListener('storage', refreshSettings);
    return () => window.removeEventListener('storage', refreshSettings);
  }, [refreshSettings]);

  // Build reply lookup map
  const replyMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !sending) return;
    setSending(true);
    try {
      await onSend(text, undefined, undefined, replyingTo?.id);
      setText('');
      setReplyingTo(null);
    } catch (err: any) { toast.error(err.message); }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    else if (e.key === 'Escape' && replyingTo) { setReplyingTo(null); }
    else { onTyping(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setSending(true);
    try { const { url, type } = await onUpload(file); await onSend(undefined, url, type); } catch { toast.error(t('uploadFailed')); }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGifSelect = async (gifUrl: string) => {
    setShowGifPicker(false);
    setSending(true);
    try { await onSend(undefined, gifUrl, 'gif'); } catch { toast.error(t('uploadFailed')); }
    setSending(false);
  };

  const toggleRecording = async () => {
    if (recording) { mediaRecorderRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setSending(true);
        try { const { url, type } = await onUpload(file); await onSend(undefined, url, type); } catch { toast.error(t('uploadFailed')); }
        setSending(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { toast.error('Microphone access denied'); }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleDelete = async (messageId: string) => {
    try { await onDelete(messageId); toast.success(t('messageDeleted')); } catch { toast.error('Failed to delete'); }
  };

  const isGlobal = room?.id === globalRoomId;
  const isDm = room?.type === 'dm';
  const roomName = isGlobal ? t('globalChat') : room?.otherUser?.channel_name || 'Chat';
  const typingList = Array.from(typingUsers.values()).filter(u => u.user_id !== userId);
  const msgTextClass = chatUiSettings.textSize === 'small' ? 'text-xs' : chatUiSettings.textSize === 'large' ? 'text-base' : 'text-sm';

  const shouldShowAvatar = (msg: ChatMessage, idx: number) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    if (prev.user_id !== msg.user_id) return true;
    return new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 120000;
  };

  if (activeCall && isDm && room?.otherUser) {
    return (
      <CallScreen
        roomId={room.id}
        userId={userId}
        otherUser={room.otherUser}
        isVideo={activeCall.isVideo}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden w-8 h-8" onClick={onToggleSidebar}>
          <Menu className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{roomName}</h2>
          {!isGlobal && room?.otherUser && (
            <p className={`text-[10px] ${room.otherUser.is_online ? 'text-green-500' : 'text-muted-foreground'}`}>
              {room.otherUser.is_online ? t('online') : t('offline')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDm && room?.otherUser && (
            <>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setActiveCall({ isVideo: false })} title={t('voiceCall')}>
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setActiveCall({ isVideo: true })} title={t('videoCall')}>
                <Video className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {connectionLost && (
        <div className="bg-destructive/10 text-destructive text-xs py-2 px-4 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5" /> {t('connectionLost')}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        style={chatUiSettings.chatBackground ? {
          background: chatUiSettings.chatBackground.startsWith('url(')
            ? `${chatUiSettings.chatBackground} center/cover no-repeat fixed`
            : chatUiSettings.chatBackground
        } : undefined}
      >
        {hasMore && (
          <div className="flex justify-center py-3">
            <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMessages} className="text-xs">
              <ArrowUp className="w-3 h-3 mr-1" /> {t('loadMore')}
            </Button>
          </div>
        )}
        {loadingMessages && messages.length === 0 ? (
          <div className="space-y-4 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t('noMessages')}</p>
          </div>
        ) : (
          <div className={chatUiSettings.compactMode ? 'py-2 space-y-0' : 'py-4 space-y-0.5'}>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.user_id === userId}
                showAvatar={shouldShowAvatar(msg, idx)}
                bubbleStyle={chatUiSettings.bubbleStyle}
                textSize={chatUiSettings.textSize}
                compactMode={chatUiSettings.compactMode}
                replyMessage={msg.reply_to ? replyMap.get(msg.reply_to) || null : null}
                onReply={handleReply}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
        {typingList.length > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
            {typingList.map(u => u.channel_name).join(', ')} {t('typing')}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="border-t border-border px-4 py-2 flex items-center gap-2 bg-muted/30">
          <div className="border-l-2 border-primary pl-2 flex-1 min-w-0">
            <p className="text-[10px] font-medium text-primary">{t('replyingTo')} {replyingTo.profile?.channel_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content || 'Media'}</p>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={() => setReplyingTo(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0 relative">
        {showGifPicker && (
          <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={sending}>
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => setShowGifPicker(v => !v)} disabled={sending}>
            <Smile className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className={`w-8 h-8 shrink-0 ${recording ? 'text-destructive' : ''}`} onClick={toggleRecording} disabled={sending && !recording}>
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('typeMessage')}
            className={`flex-1 h-10 ${msgTextClass}`}
            disabled={sending}
          />
          <Button size="icon" className="w-10 h-10 shrink-0 rounded-full" onClick={handleSend} disabled={(!text.trim() && !sending) || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <ChatSettings
          onClose={() => setShowSettings(false)}
          profile={profile}
          isGuest={isGuest}
          onUpdateProfile={onUpdateProfile}
          onUploadAvatar={onUploadAvatar}
        />
      )}
    </div>
  );
}
