// JWT verification for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function verifyJwt(req: Request, supabaseUrl: string, supabaseKey: string): Promise<{ user: any; error: any }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: { message: 'Missing Authorization header', status: 401 } };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: { message: 'Invalid or expired token', status: 401 } };
  }

  return { user, error: null };
}

export async function getProfile(supabaseUrl: string, supabaseKey: string, userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function isAdmin(supabaseUrl: string, supabaseKey: string, userId: string): Promise<boolean> {
  const { data } = await getProfile(supabaseUrl, supabaseKey, userId);
  return data?.role === 'admin';
}