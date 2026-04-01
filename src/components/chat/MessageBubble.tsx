import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { Reply, Trash2, MoreVertical } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useChat';

type BubbleStyle = 'rounded' | 'square' | 'pill';
type ChatTextSize = 'small' | 'normal' | 'large';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  bubbleStyle?: BubbleStyle;
  textSize?: ChatTextSize;
  compactMode?: boolean;
  replyMessage?: ChatMessage | null;
  onReply?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  bubbleStyle = 'rounded',
  textSize = 'normal',
  compactMode = false,
  replyMessage,
  onReply,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const initials = (name: string) => name.slice(0, 2).toUpperCase();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubbleRadius =
    bubbleStyle === 'square' ? 'rounded-md' : bubbleStyle === 'pill' ? 'rounded-3xl' : 'rounded-2xl';
  const ownCorner = bubbleStyle === 'square' ? 'rounded-br-sm' : 'rounded-br-md';
  const otherCorner = bubbleStyle === 'square' ? 'rounded-bl-sm' : 'rounded-bl-md';
  const textSizeClass = textSize === 'small' ? 'text-xs' : textSize === 'large' ? 'text-base' : 'text-sm';
  const bubblePadding = compactMode ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const rowPadding = compactMode ? 'py-px' : 'py-0.5';
  const timeSize = compactMode ? 'text-[8px]' : 'text-[9px]';

  const isGif = message.media_type === 'gif' || (message.media_url && message.media_url.includes('tenor'));

  return (
    <div
      className={`group flex gap-2 px-4 ${rowPadding} ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end relative`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="w-7 shrink-0">
        {showAvatar && !isOwn && (
          <Avatar className="w-7 h-7">
            <AvatarImage src={message.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {message.profile ? initials(message.profile.channel_name) : '??'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showAvatar && !isOwn && (
          <span className="text-[10px] font-medium text-muted-foreground mb-0.5 px-1">
            {message.profile?.channel_name || 'Unknown'}
          </span>
        )}

        {/* Reply preview */}
        {replyMessage && (
          <div className={`${isOwn ? 'self-end' : 'self-start'} max-w-full mb-0.5`}>
            <div className="bg-muted/50 border-l-2 border-primary rounded-lg px-2.5 py-1 text-[10px] text-muted-foreground truncate max-w-[200px]">
              <span className="font-medium">{replyMessage.profile?.channel_name || 'Unknown'}</span>
              <p className="truncate">{replyMessage.content || (replyMessage.media_type === 'image' ? 'Image' : 'Media')}</p>
            </div>
          </div>
        )}

        <div
          className={`${bubbleRadius} ${bubblePadding} ${textSizeClass} break-words overflow-wrap-anywhere ${
            isGif ? 'bg-transparent p-0' :
            isOwn
              ? `bg-primary text-primary-foreground ${ownCorner}`
              : `bg-muted text-foreground ${otherCorner}`
          }`}
        >
          {isGif && message.media_url && (
            <img
              src={message.media_url}
              alt="GIF"
              className="rounded-lg max-w-full max-h-48 object-cover"
              loading="lazy"
            />
          )}
          {!isGif && message.media_type === 'image' && message.media_url && (
            <img
              src={message.media_url}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-60 object-cover mb-1"
              loading="lazy"
            />
          )}
          {message.media_type === 'voice' && message.media_url && (
            <audio controls src={message.media_url} className="max-w-full" preload="metadata" />
          )}
          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        </div>

        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className={`${timeSize} text-muted-foreground`}>{time}</span>
          {isOwn && (
            <span className={`${timeSize} text-muted-foreground`}>
              {message.is_read ? t('read') : t('delivered')}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (onReply || onDelete) && (
        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
          {onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 rounded-full"
              onClick={() => onReply(message)}
              title={t('reply')}
            >
              <Reply className="w-3 h-3" />
            </Button>
          )}
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 rounded-full text-destructive hover:text-destructive"
              onClick={() => onDelete(message.id)}
              title={t('deleteMessage')}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
