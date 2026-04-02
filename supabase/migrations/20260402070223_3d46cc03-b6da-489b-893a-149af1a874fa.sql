
-- Create profiles table for Koma OS users
CREATE TABLE public.koma_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'User',
  language TEXT DEFAULT 'en',
  region TEXT DEFAULT 'us',
  avatar_url TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.koma_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by all authenticated" ON public.koma_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON public.koma_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.koma_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Announcements table for admin broadcasts
CREATE TABLE public.koma_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'broadcast',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.koma_announcements ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.koma_announcements;

CREATE POLICY "Anyone authenticated can read announcements" ON public.koma_announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert announcements" ON public.koma_announcements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Bans table
CREATE TABLE public.koma_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banned_user_id TEXT NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT DEFAULT 'Temporary ban',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.koma_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read bans" ON public.koma_bans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert bans" ON public.koma_bans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = banned_by);

-- KomaHub packs table
CREATE TABLE public.koma_hub_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  pack_type TEXT DEFAULT 'theme',
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.koma_hub_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view hub packs" ON public.koma_hub_packs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can upload packs" ON public.koma_hub_packs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can delete own packs" ON public.koma_hub_packs
  FOR DELETE TO authenticated USING (auth.uid() = uploader_id);

-- User wallpaper preferences
CREATE TABLE public.koma_user_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  wallpaper_code TEXT,
  wallpaper_url TEXT,
  wallpaper_type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.koma_user_wallpapers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallpaper" ON public.koma_user_wallpapers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallpaper" ON public.koma_user_wallpapers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallpaper" ON public.koma_user_wallpapers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for KomaHub uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('komahub', 'komahub', true);

CREATE POLICY "Anyone can view komahub files" ON storage.objects
  FOR SELECT USING (bucket_id = 'komahub');

CREATE POLICY "Authenticated users can upload to komahub" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'komahub');

CREATE POLICY "Users can delete own komahub files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'komahub' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_koma_profiles_updated_at
  BEFORE UPDATE ON public.koma_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_koma_wallpapers_updated_at
  BEFORE UPDATE ON public.koma_user_wallpapers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
