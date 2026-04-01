import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, MessageSquare, Type, Minimize2, Palette, Camera, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type BubbleStyle = 'rounded' | 'square' | 'pill';
type ChatTextSize = 'small' | 'normal' | 'large';

interface ChatUiSettings {
  bubbleStyle: BubbleStyle;
  textSize: ChatTextSize;
  compactMode: boolean;
  chatBackground: string;
}

const DEFAULT: ChatUiSettings = { bubbleStyle: 'rounded', textSize: 'normal', compactMode: false, chatBackground: '' };

const BACKGROUND_PRESETS = [
  { label: 'None', value: '', color: 'transparent' },
  { label: 'Dark', value: 'hsl(222, 84%, 5%)', color: 'hsl(222, 84%, 5%)' },
  { label: 'Navy', value: 'hsl(220, 60%, 12%)', color: 'hsl(220, 60%, 12%)' },
  { label: 'Forest', value: 'hsl(150, 40%, 10%)', color: 'hsl(150, 40%, 10%)' },
  { label: 'Wine', value: 'hsl(340, 40%, 12%)', color: 'hsl(340, 40%, 12%)' },
  { label: 'Midnight', value: 'hsl(260, 50%, 10%)', color: 'hsl(260, 50%, 10%)' },
];

function load(): ChatUiSettings {
  try {
    const raw = JSON.parse(localStorage.getItem('koma_chat_settings') || '{}');
    return {
      bubbleStyle: ['rounded','square','pill'].includes(raw.bubbleStyle) ? raw.bubbleStyle : 'rounded',
      textSize: ['small','normal','large'].includes(raw.textSize) ? raw.textSize : 'normal',
      compactMode: Boolean(raw.compactMode),
      chatBackground: raw.chatBackground || '',
    };
  } catch { return DEFAULT; }
}

export interface ChatSettingsProps {
  onClose: () => void;
  profile?: {
    channel_name: string;
    avatar_url: string | null;
    bio?: string;
  } | null;
  isGuest?: boolean;
  onUpdateProfile?: (updates: { channel_name?: string; avatar_url?: string | null; bio?: string }) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
}

export function ChatSettings({ onClose, profile, isGuest, onUpdateProfile, onUploadAvatar }: ChatSettingsProps) {
  const [settings, setSettings] = useState<ChatUiSettings>(load);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');
  const [editName, setEditName] = useState(profile?.channel_name || '');
  const [editBio, setEditBio] = useState((profile as any)?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = (patch: Partial<ChatUiSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem('koma_chat_settings', JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }

    if (isGuest) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAvatarPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    } else if (onUploadAvatar) {
      setUploading(true);
      try {
        const url = await onUploadAvatar(file);
        if (url) setAvatarPreview(url);
      } catch { toast.error('Upload failed'); }
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Username is required'); return; }
    setSaving(true);
    try {
      onUpdateProfile?.({
        channel_name: editName.trim(),
        avatar_url: avatarPreview || null,
        bio: editBio.trim(),
      });
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleSetCustomBackground = () => {
    if (customBgUrl.trim()) {
      save({ chatBackground: `url(${customBgUrl.trim()})` });
      setCustomBgUrl('');
    }
  };

  const bubbleOptions: { value: BubbleStyle; label: string; preview: string }[] = [
    { value: 'rounded', label: 'Rounded', preview: 'rounded-2xl' },
    { value: 'square', label: 'Square', preview: 'rounded-md' },
    { value: 'pill', label: 'Pill', preview: 'rounded-3xl' },
  ];

  const textOptions: { value: ChatTextSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Large' },
  ];

  const initials = editName ? editName.slice(0, 2).toUpperCase() : 'G';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Settings
          </h2>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' ? (
            <div className="space-y-5">
              {/* Bubble Style */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2.5">
                  <MessageSquare className="w-3 h-3" /> Bubble Style
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {bubbleOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => save({ bubbleStyle: opt.value })}
                      className={`py-2.5 px-3 text-xs font-medium border transition-all ${
                        settings.bubbleStyle === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      } ${opt.preview}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-1.5 px-2">
                  <div className={`self-end bg-primary text-primary-foreground text-[11px] px-3 py-1.5 max-w-[70%] ${
                    settings.bubbleStyle === 'square' ? 'rounded-md rounded-br-sm' : settings.bubbleStyle === 'pill' ? 'rounded-3xl' : 'rounded-2xl rounded-br-md'
                  }`}>Hey! How are you?</div>
                  <div className={`self-start bg-muted text-foreground text-[11px] px-3 py-1.5 max-w-[70%] ${
                    settings.bubbleStyle === 'square' ? 'rounded-md rounded-bl-sm' : settings.bubbleStyle === 'pill' ? 'rounded-3xl' : 'rounded-2xl rounded-bl-md'
                  }`}>I'm great, thanks!</div>
                </div>
              </div>

              {/* Text Size */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2.5">
                  <Type className="w-3 h-3" /> Text Size
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {textOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => save({ textSize: opt.value })}
                      className={`py-2 px-3 font-medium border rounded-lg transition-all ${
                        settings.textSize === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      } ${opt.value === 'small' ? 'text-[10px]' : opt.value === 'large' ? 'text-sm' : 'text-xs'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Background */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2.5">
                  <Palette className="w-3 h-3" /> Chat Background
                </Label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {BACKGROUND_PRESETS.map(bg => (
                    <button
                      key={bg.label}
                      onClick={() => save({ chatBackground: bg.value })}
                      className={`h-12 rounded-lg border-2 transition-all flex items-center justify-center text-[10px] font-medium ${
                        settings.chatBackground === bg.value
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                      style={{ background: bg.color || 'var(--background)' }}
                    >
                      <span className={bg.value ? 'text-white/80' : 'text-muted-foreground'}>{bg.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customBgUrl}
                    onChange={e => setCustomBgUrl(e.target.value)}
                    placeholder="Image URL for background..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSetCustomBackground}>
                    Set
                  </Button>
                </div>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between py-3 px-1 border-t border-border">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Minimize2 className="w-3 h-3" /> Compact Mode
                </Label>
                <Switch checked={settings.compactMode} onCheckedChange={(v) => save({ compactMode: v })} />
              </div>
            </div>
          ) : (
            /* Profile Tab */
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploading ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : <Camera className="w-5 h-5 text-primary-foreground" />}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Tap to change photo</p>
                {isGuest && (
                  <p className="text-[9px] text-muted-foreground/70 mt-1">📱 Stored on this device only</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Username
                </Label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your username"
                  className="h-10"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Bio
                </Label>
                <Textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell everyone about yourself..."
                  className="min-h-[80px] text-sm resize-none"
                  maxLength={200}
                />
                <p className="text-[10px] text-muted-foreground text-right">{editBio.length}/200</p>
              </div>

              {/* Save Button */}
              <Button className="w-full h-10" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
