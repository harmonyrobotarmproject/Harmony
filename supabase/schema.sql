-- ===== Harmony Platform Database Schema =====
-- PostgreSQL schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 1. Profiles (extends auth.users) =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Guest'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== 2. Robot Sessions =====
CREATE TABLE public.robot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Session',
  description TEXT,
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'detecting', 'detected', 'parsing', 'running', 'completed', 'error')),
  calibration JSONB DEFAULT '{"pixelToMeter": 0.005, "fixedZHeight": 0.05}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_robot_sessions_user_id ON public.robot_sessions(user_id);
CREATE INDEX idx_robot_sessions_created_at ON public.robot_sessions(created_at DESC);
CREATE INDEX idx_robot_sessions_status ON public.robot_sessions(status);

-- RLS
ALTER TABLE public.robot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.robot_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.robot_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.robot_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.robot_sessions FOR DELETE USING (auth.uid() = user_id);

-- ===== 3. Robot Objects (detected objects) =====
CREATE TABLE public.robot_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.robot_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pixel_u INTEGER NOT NULL,
  pixel_v INTEGER NOT NULL,
  world_x NUMERIC(10,6) NOT NULL,
  world_y NUMERIC(10,6) NOT NULL,
  world_z NUMERIC(10,6) NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 0.95,
  color TEXT DEFAULT '#ff0000',
  bbox_x1 INTEGER,
  bbox_y1 INTEGER,
  bbox_x2 INTEGER,
  bbox_y2 INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_robot_objects_session_id ON public.robot_objects(session_id);

ALTER TABLE public.robot_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view objects in own sessions"
  ON public.robot_objects FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.robot_sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY "System can insert objects"
  ON public.robot_objects FOR INSERT WITH CHECK (true);

-- ===== 4. Messages (chat + robot logs) =====
CREATE TABLE public.messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.robot_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'robot_command', 'robot_log', 'robot_result', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own sessions"
  ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.robot_sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages in own sessions"
  ON public.messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.robot_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===== 5. Simulation Logs =====
CREATE TABLE public.simulation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.robot_sessions(id) ON DELETE CASCADE,
  log_content TEXT NOT NULL,
  actions JSONB,
  detected_objects JSONB,
  duration_seconds NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulation_logs_session_id ON public.simulation_logs(session_id);

ALTER TABLE public.simulation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs in own sessions"
  ON public.simulation_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.robot_sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY "System can insert logs"
  ON public.simulation_logs FOR INSERT WITH CHECK (true);

-- ===== 6. System Settings =====
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Public can view allow_signup"
  ON public.system_settings FOR SELECT USING (key = 'allow_signup');

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai_provider', 'azure', 'AI Provider: azure or github'),
  ('ai_model', 'gpt-5.4-mini', 'Azure OpenAI model deployment name'),
  ('ai_enabled_globally', 'true', 'Global AI enable switch'),
  ('allow_signup', 'true', 'Allow user self-registration'),
  ('max_sessions_per_user', '50', 'Maximum sessions per user')
ON CONFLICT (key) DO NOTHING;

-- ===== 7. Storage Bucket for Images =====
-- Run in Supabase Dashboard > Storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('robot-images', 'robot-images', true);
-- CREATE POLICY "Users can upload own images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own images" ON storage.objects FOR SELECT USING (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== 8. Updated At Trigger =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_robot_sessions_updated_at BEFORE UPDATE ON public.robot_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 9. Helper Functions =====

-- Get user sessions with object count
CREATE OR REPLACE FUNCTION public.get_user_sessions_with_stats(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT,
  object_count BIGINT,
  message_count BIGINT,
  created_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    rs.id,
    rs.name,
    rs.description,
    rs.image_url,
    rs.status,
    COUNT(ro.id) as object_count,
    COUNT(m.id) as message_count,
    rs.created_at
  FROM public.robot_sessions rs
  LEFT JOIN public.robot_objects ro ON ro.session_id = rs.id
  LEFT JOIN public.messages m ON m.session_id = rs.id
  WHERE rs.user_id = p_user_id
  GROUP BY rs.id
  ORDER BY rs.created_at DESC;
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;