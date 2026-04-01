import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useGuestMode, type GuestProfile, loadGuestMessages, saveGuestMessage, type LocalMessage } from '@/hooks/useGuestMode';
import { AuthScreen } from '@/components/chat/AuthScreen';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { IncomingCallBanner } from '@/components/chat/IncomingCallBanner';
import { CallScreen } from '@/components/chat/CallScreen';
import { Skeleton } from '@/components/ui/skeleton';

const GUEST_ROOM_ID = 'guest-local-room';

export default function Chat() {
  const { user, profile, loading: authLoading, signUp, signIn, signOut } = useAuth();
  const { guestProfile, enterGuestMode, exitGuestMode, isGuest } = useGuestMode();
  const chat = useChat(user?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [answeringCall, setAnsweringCall] = useState<{ roomId: string; isVideo: boolean } | null>(null);

  // Guest mode local messages
  const [guestMessages, setGuestMessages] = useState<LocalMessage[]>(() => loadGuestMessages());

  const activeProfile = isGuest ? guestProfile : profile;
  const activeUserId = isGuest ? guestProfile?.user_id : user?.id;

  if (!isGuest && authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (!isGuest && (!user || !profile)) {
    return (
      <AuthScreen
        onSignUp={signUp}
        onSignIn={signIn}
        onGuest={() => enterGuestMode()}
      />
    );
  }

  // Guest mode chat
  if (isGuest && guestProfile) {
    const guestRoom = {
      id: GUEST_ROOM_ID,
      name: 'Local Chat',
      type: 'group' as const,
      created_at: new Date().toISOString(),
    };

    const handleGuestSend = async (content?: string) => {
      if (!content?.trim()) return;
      const msg: LocalMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        content: content.trim(),
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        user_id: guestProfile.user_id,
        room_id: GUEST_ROOM_ID,
        is_read: true,
        reply_to: null,
        profile: guestProfile,
      };
      saveGuestMessage(msg);
      setGuestMessages(prev => [...prev, msg]);
    };

    return (
      <div className="h-screen flex bg-background overflow-hidden">
        <div className="hidden md:block w-72 border-r border-border shrink-0">
          <ChatSidebar
            rooms={[guestRoom]}
            activeRoom={GUEST_ROOM_ID}
            profile={guestProfile}
            globalRoomId={GUEST_ROOM_ID}
            onSwitchRoom={() => {}}
            onStartDm={async () => ''}
            onSignOut={exitGuestMode}
            loading={false}
          />
        </div>
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-xl">
              <ChatSidebar
                rooms={[guestRoom]}
                activeRoom={GUEST_ROOM_ID}
                profile={guestProfile}
                globalRoomId={GUEST_ROOM_ID}
                onSwitchRoom={() => {}}
                onStartDm={async () => ''}
                onSignOut={exitGuestMode}
                loading={false}
              />
            </div>
          </>
        )}
        <div className="flex-1 min-w-0">
          <ChatWindow
            room={guestRoom}
            messages={guestMessages as any}
            typingUsers={new Map()}
            userId={guestProfile.user_id}
            loadingMessages={false}
            hasMore={false}
            connectionLost={false}
            globalRoomId={GUEST_ROOM_ID}
            onSend={handleGuestSend}
            onUpload={async () => ({ url: '', type: 'image' as const })}
            onTyping={async () => {}}
            onLoadMore={() => {}}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            onDelete={async () => {}}
          />
        </div>
      </div>
    );
  }

  // Authenticated mode
  if (answeringCall) {
    const callRoom = chat.rooms.find(r => r.id === answeringCall.roomId);
    if (callRoom?.otherUser) {
      return (
        <CallScreen
          roomId={answeringCall.roomId}
          userId={user!.id}
          otherUser={callRoom.otherUser}
          isVideo={answeringCall.isVideo}
          isIncoming
          onEnd={() => setAnsweringCall(null)}
        />
      );
    }
  }

  const activeRoomData = chat.rooms.find(r => r.id === chat.activeRoom);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {chat.incomingCall && !answeringCall && (
        <IncomingCallBanner
          callerProfile={chat.incomingCall.callerProfile}
          isVideo={chat.incomingCall.isVideo}
          onAccept={() => {
            setAnsweringCall({ roomId: chat.incomingCall!.roomId, isVideo: chat.incomingCall!.isVideo });
            chat.dismissIncomingCall();
          }}
          onDecline={() => chat.dismissIncomingCall()}
        />
      )}
      <div className="hidden md:block w-72 border-r border-border shrink-0">
        <ChatSidebar
          rooms={chat.rooms}
          activeRoom={chat.activeRoom}
          profile={profile!}
          globalRoomId={chat.GLOBAL_ROOM_ID}
          onSwitchRoom={(id) => { chat.switchRoom(id); setSidebarOpen(false); }}
          onStartDm={chat.startDm}
          onSignOut={signOut}
          loading={false}
        />
      </div>
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-xl">
            <ChatSidebar
              rooms={chat.rooms}
              activeRoom={chat.activeRoom}
              profile={profile!}
              globalRoomId={chat.GLOBAL_ROOM_ID}
              onSwitchRoom={(id) => { chat.switchRoom(id); setSidebarOpen(false); }}
              onStartDm={chat.startDm}
              onSignOut={signOut}
              loading={false}
            />
          </div>
        </>
      )}
      <div className="flex-1 min-w-0">
        <ChatWindow
          room={activeRoomData}
          messages={chat.messages}
          typingUsers={chat.typingUsers}
          userId={user!.id}
          loadingMessages={chat.loadingMessages}
          hasMore={chat.hasMore}
          connectionLost={chat.connectionLost}
          globalRoomId={chat.GLOBAL_ROOM_ID}
          onSend={chat.sendMessage}
          onUpload={chat.uploadMedia}
          onTyping={chat.setTyping}
          onLoadMore={chat.loadMore}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onDelete={chat.deleteMessage}
        />
      </div>
    </div>
  );
}
