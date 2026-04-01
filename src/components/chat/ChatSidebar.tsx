import React, { useState } from 'react';
import { t } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Globe, Search, LogOut, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/hooks/useAuth';
import type { Room } from '@/hooks/useChat';
import { toast } from 'sonner';

const db = supabase as unknown as SupabaseClient;

interface ChatSidebarProps {
  rooms: Room[];
  activeRoom: string;
  profile: Profile | null;
  globalRoomId: string;
  onSwitchRoom: (id: string) => void;
  onStartDm: (userId: string) => Promise<string>;
  onSignOut: () => void;
  loading: boolean;
}

export function ChatSidebar({
  rooms, activeRoom, profile, globalRoomId,
  onSwitchRoom, onStartDm, onSignOut, loading,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await db
      .from('profiles')
      .select('*')
      .ilike('channel_name', `%${q}%`)
      .neq('user_id', profile?.user_id || '')
      .limit(10);
    setSearchResults((data as Profile[]) || []);
    setSearching(false);
  };

  const handleStartDm = async (otherUser: Profile) => {
    try {
      const roomId = await onStartDm(otherUser.user_id);
      onSwitchRoom(roomId);
      setSearch('');
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Koma Chat</span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('searchUsers')}
            className="pl-8 h-9 text-xs bg-sidebar-accent border-none"
          />
        </div>
      </div>

      {/* Search Results */}
      {search.length >= 2 && (
        <div className="border-b border-sidebar-border">
          {searching ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : searchResults.length > 0 ? (
            <ScrollArea className="max-h-40">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleStartDm(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-sidebar-accent transition-colors text-left"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.channel_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.channel_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {u.is_online ? t('online') : t('offline')}
                    </p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </ScrollArea>
          ) : (
            <p className="p-3 text-xs text-muted-foreground text-center">No users found</p>
          )}
        </div>
      )}

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t('chats')}</p>
          {loading ? (
            <div className="space-y-2 p-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t('noChats')}</p>
          ) : (
            rooms.map(room => {
              const isActive = room.id === activeRoom;
              const isGlobal = room.id === globalRoomId;
              const displayName = isGlobal ? t('globalChat') : room.otherUser?.channel_name || 'Chat';
              const lastMsg = room.lastMessage?.content || (room.lastMessage?.media_type === 'image' ? '📷 Image' : room.lastMessage?.media_type === 'voice' ? '🎤 Voice' : '');

              return (
                <button
                  key={room.id}
                  onClick={() => onSwitchRoom(room.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors mb-0.5 ${
                    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50'
                  }`}
                >
                  <div className="relative">
                    {isGlobal ? (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={room.otherUser?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isGlobal && room.otherUser?.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{displayName}</p>
                    {lastMsg && <p className="text-[10px] text-muted-foreground truncate">{lastMsg}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Profile Footer */}
      <div className="p-3 border-t border-sidebar-border flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {profile ? initials(profile.channel_name) : <User className="w-3.5 h-3.5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{profile?.channel_name}</p>
          <p className="text-[10px] text-green-500">{t('online')}</p>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onSignOut}>
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
