import React, { useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/hooks/useAuth';
import { toast } from 'sonner';

const db = supabase as unknown as SupabaseClient;

interface ProfileEditorProps {
  profile: Profile;
  onClose: () => void;
  onUpdate: (profile: Profile) => void;
}

export function ProfileEditor({ profile, onClose, onUpdate }: ProfileEditorProps) {
  const [channelName, setChannelName] = useState(profile.channel_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${profile.user_id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('chat-media').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!channelName.trim()) { toast.error('Username is required'); return; }
    setSaving(true);
    try {
      const { error } = await db
        .from('profiles')
        .update({ channel_name: channelName.trim(), avatar_url: avatarUrl || null } as any)
        .eq('user_id', profile.user_id);
      if (error) throw error;
      onUpdate({ ...profile, channel_name: channelName.trim(), avatar_url: avatarUrl || null });
      toast.success('Profile updated!');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const initials = channelName.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">{t('editProfile')}</h2>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : <Camera className="w-5 h-5 text-primary-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Tap to change photo</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('channelName')}</Label>
            <Input value={channelName} onChange={e => setChannelName(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t('email')}</Label>
            <Input value="(not editable)" disabled className="h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>{t('cancel')}</Button>
          <Button className="flex-1 h-10" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
