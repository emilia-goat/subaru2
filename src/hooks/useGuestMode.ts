import { useState, useCallback } from 'react';
import type { Profile } from './useAuth';

const GUEST_KEY = 'koma_guest_profile';
const GUEST_MESSAGES_KEY = 'koma_guest_messages';

export interface GuestProfile extends Profile {
  bio: string;
  chatBackground: string;
}

function generateGuestId(): string {
  return 'guest-' + Math.random().toString(36).substring(2, 10);
}

function generateGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest_${num}`;
}

export function loadGuestProfile(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveGuestProfile(profile: GuestProfile): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(profile));
}

export function clearGuestProfile(): void {
  localStorage.removeItem(GUEST_KEY);
  localStorage.removeItem(GUEST_MESSAGES_KEY);
}

export function useGuestMode() {
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(loadGuestProfile);

  const enterGuestMode = useCallback((): GuestProfile => {
    const id = generateGuestId();
    const profile: GuestProfile = {
      id,
      user_id: id,
      channel_name: generateGuestName(),
      avatar_url: null,
      is_online: true,
      last_seen: new Date().toISOString(),
      bio: '',
      chatBackground: '',
    };
    saveGuestProfile(profile);
    setGuestProfile(profile);
    return profile;
  }, []);

  const updateGuestProfile = useCallback((updates: Partial<GuestProfile>) => {
    setGuestProfile(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      saveGuestProfile(next);
      return next;
    });
  }, []);

  const exitGuestMode = useCallback(() => {
    clearGuestProfile();
    setGuestProfile(null);
  }, []);

  return { guestProfile, enterGuestMode, updateGuestProfile, exitGuestMode, isGuest: !!guestProfile };
}

export interface LocalMessage {
  id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
  room_id: string;
  is_read: boolean;
  reply_to: string | null;
  profile?: Profile;
}

export function loadGuestMessages(): LocalMessage[] {
  try {
    const raw = localStorage.getItem(GUEST_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveGuestMessage(msg: LocalMessage): void {
  const messages = loadGuestMessages();
  messages.push(msg);
  const trimmed = messages.slice(-200);
  localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(trimmed));
}
