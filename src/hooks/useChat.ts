import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from './useAuth';

const db = supabase as unknown as SupabaseClient;

const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 30;

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  created_at: string;
  reply_to: string | null;
  profile?: Profile;
}

export interface Room {
  id: string;
  name: string | null;
  type: string;
  created_at: string;
  otherUser?: Profile;
  lastMessage?: ChatMessage;
}

export interface IncomingCall {
  roomId: string;
  callerId: string;
  callerProfile: Profile;
  isVideo: boolean;
}

export function useChat(userId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>(GLOBAL_ROOM_ID);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<string, Profile>>(new Map());
  const [connectionLost, setConnectionLost] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const callChannelsRef = useRef<Map<string, any>>(new Map());

  const fetchProfileCached = useCallback(async (uid: string): Promise<Profile | null> => {
    if (profileCache.current.has(uid)) return profileCache.current.get(uid)!;
    const { data } = await db.from('profiles').select('*').eq('user_id', uid).maybeSingle();
    if (data) profileCache.current.set(uid, data as Profile);
    return data as Profile | null;
  }, []);

  const fetchRooms = useCallback(async () => {
    if (!userId) return;
    const { data: memberData } = await db
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId);

    const roomIds = memberData?.map(r => r.room_id) || [];
    const allRoomIds = [GLOBAL_ROOM_ID, ...roomIds.filter(id => id !== GLOBAL_ROOM_ID)];

    const { data: roomData } = await db.from('rooms').select('*').in('id', allRoomIds);
    if (!roomData) return;

    const enriched: Room[] = await Promise.all(
      roomData.map(async (room: any) => {
        let otherUser: Profile | undefined;
        if (room.type === 'dm') {
          const { data: members } = await db
            .from('room_members')
            .select('user_id')
            .eq('room_id', room.id)
            .neq('user_id', userId);
          if (members?.[0]) {
            const p = await fetchProfileCached(members[0].user_id);
            if (p) otherUser = p;
          }
        }
        const { data: lastMsg } = await db
          .from('chat_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return { ...room, otherUser, lastMessage: lastMsg?.[0] as ChatMessage | undefined } as Room;
      })
    );

    enriched.sort((a, b) => {
      if (a.id === GLOBAL_ROOM_ID) return -1;
      if (b.id === GLOBAL_ROOM_ID) return 1;
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setRooms(enriched);
  }, [userId, fetchProfileCached]);

  const fetchMessages = useCallback(async (roomId: string, before?: string) => {
    setLoadingMessages(true);
    let query = db
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) { setLoadingMessages(false); return; }

    const msgs = data as ChatMessage[];
    const enriched = await Promise.all(
      msgs.map(async (m) => ({
        ...m,
        profile: (await fetchProfileCached(m.user_id)) || undefined,
      }))
    );

    const reversed = enriched.reverse();
    if (before) {
      setMessages(prev => [...reversed, ...prev]);
    } else {
      setMessages(reversed);
    }
    setHasMore(msgs.length === PAGE_SIZE);
    setLoadingMessages(false);
  }, [fetchProfileCached]);

  const loadMore = useCallback(() => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(activeRoom, messages[0].created_at);
    }
  }, [messages, hasMore, activeRoom, fetchMessages]);

  const sendMessage = useCallback(async (content?: string, mediaUrl?: string, mediaType?: string, replyTo?: string) => {
    if (!userId || (!content?.trim() && !mediaUrl)) return;
    const { error } = await db.from('chat_messages').insert({
      room_id: activeRoom,
      user_id: userId,
      content: content?.trim() || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      reply_to: replyTo || null,
    });
    if (error) throw error;
    await db.from('typing_indicators').delete().eq('room_id', activeRoom).eq('user_id', userId);
  }, [userId, activeRoom]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId) return;
    const { error } = await db.from('chat_messages').delete().eq('id', messageId).eq('user_id', userId);
    if (error) throw error;
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [userId]);

  const uploadMedia = useCallback(async (file: File): Promise<{ url: string; type: 'image' | 'voice' }> => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    const mediaType = file.type.startsWith('audio') ? 'voice' : 'image';
    return { url: data.publicUrl, type: mediaType };
  }, [userId]);

  const setTyping = useCallback(async () => {
    if (!userId) return;
    await db.from('typing_indicators').upsert(
      { room_id: activeRoom, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'room_id,user_id' }
    );
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(async () => {
      await db.from('typing_indicators').delete().eq('room_id', activeRoom).eq('user_id', userId);
    }, 3000);
  }, [userId, activeRoom]);

  const markAsRead = useCallback(async (roomId: string) => {
    if (!userId) return;
    await db
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('user_id', userId)
      .eq('is_read', false);
  }, [userId]);

  const startDm = useCallback(async (otherUserId: string): Promise<string> => {
    if (!userId) throw new Error('Not authenticated');
    const { data, error } = await db.rpc('get_or_create_dm', {
      user1_id: userId,
      user2_id: otherUserId,
    });
    if (error) throw error;
    await fetchRooms();
    return data as string;
  }, [userId, fetchRooms]);

  const switchRoom = useCallback((roomId: string) => {
    setActiveRoom(roomId);
    setMessages([]);
    setHasMore(true);
  }, []);

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Listen for incoming calls on all DM rooms
  useEffect(() => {
    if (!userId) return;

    // Subscribe to call signals on all DM rooms
    const subscribeToCallSignals = async () => {
      const { data: memberData } = await db
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId);

      const roomIds = memberData?.map(r => r.room_id) || [];

      roomIds.forEach(roomId => {
        if (callChannelsRef.current.has(roomId)) return;

        const ch = supabase.channel(`call-listen-${roomId}-${userId}`, {
          config: { broadcast: { self: false } },
        });

        ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (payload.from === userId) return;
          if (payload.type === 'call') {
            const callerProfile = await fetchProfileCached(payload.from);
            if (callerProfile) {
              setIncomingCall({
                roomId,
                callerId: payload.from,
                callerProfile,
                isVideo: payload.isVideo,
              });
            }
          }
        });

        ch.subscribe();
        callChannelsRef.current.set(roomId, ch);
      });
    };

    subscribeToCallSignals();

    return () => {
      callChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      callChannelsRef.current.clear();
    };
  }, [userId, rooms.length]);

  useEffect(() => {
    if (!userId) return;
    fetchRooms();
  }, [userId, fetchRooms]);

  useEffect(() => {
    fetchMessages(activeRoom);
    markAsRead(activeRoom);
  }, [activeRoom]);

  useEffect(() => {
    if (!userId) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const msgChannel = supabase
      .channel(`messages-${activeRoom}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoom}`,
      }, async (payload) => {
        const msg = payload.new as ChatMessage;
        const profile = await fetchProfileCached(msg.user_id);
        setMessages(prev => [...prev, { ...msg, profile: profile || undefined }]);
        if (msg.user_id !== userId) markAsRead(activeRoom);
        fetchRooms();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoom}`,
      }, (payload) => {
        const old = payload.old as any;
        if (old?.id) setMessages(prev => prev.filter(m => m.id !== old.id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionLost(false);
          if (reconnectTimer) clearTimeout(reconnectTimer);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionLost(true);
          reconnectTimer = setTimeout(() => fetchMessages(activeRoom), 3000);
        }
      });

    const typingChannel = supabase
      .channel(`typing-${activeRoom}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `room_id=eq.${activeRoom}`,
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(old.user_id);
            return next;
          });
        } else {
          const row = payload.new as any;
          if (row.user_id !== userId) {
            const profile = await fetchProfileCached(row.user_id);
            if (profile) {
              setTypingUsers(prev => new Map(prev).set(row.user_id, profile));
            }
          }
        }
      })
      .subscribe();

    const heartbeat = setInterval(async () => {
      if (msgChannel.state !== 'joined') {
        setConnectionLost(true);
        fetchMessages(activeRoom);
      }
    }, 30000);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(heartbeat);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [userId, activeRoom]);

  return {
    rooms,
    activeRoom,
    messages,
    loadingMessages,
    hasMore,
    typingUsers,
    connectionLost,
    incomingCall,
    sendMessage,
    deleteMessage,
    uploadMedia,
    setTyping,
    switchRoom,
    startDm,
    loadMore,
    markAsRead,
    fetchRooms,
    dismissIncomingCall,
    GLOBAL_ROOM_ID,
  };
}
