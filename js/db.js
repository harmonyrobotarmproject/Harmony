// ===== Harmony Database Wrapper =====
// Supabase 資料庫存取封裝

const db = {
  // ===== Profiles =====
  async getProfile(userId) {
    const { data, error } = await _supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId, updates) {
    const { data, error } = await _supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getProfileByEmail(email) {
    const { data, error } = await _supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    return { data, error };
  },

  // ===== Rooms (Sessions) =====
  async createSession(sessionData) {
    const { data, error } = await _supabase
      .from('robot_sessions')
      .insert(sessionData)
      .select()
      .single();
    return { data, error };
  },

  async getSession(sessionId) {
    const { data, error } = await _supabase
      .from('robot_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    return { data, error };
  },

  async getUserSessions(userId) {
    const { data, error } = await _supabase
      .from('robot_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async updateSession(sessionId, updates) {
    const { data, error } = await _supabase
      .from('robot_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    return { data, error };
  },

  async deleteSession(sessionId) {
    const { error } = await _supabase
      .from('robot_sessions')
      .delete()
      .eq('id', sessionId);
    return { error };
  },

  // ===== Robot Objects =====
  async createRobotObject(objectData) {
    const { data, error } = await _supabase
      .from('robot_objects')
      .insert(objectData)
      .select()
      .single();
    return { data, error };
  },

  async getSessionObjects(sessionId) {
    const { data, error } = await _supabase
      .from('robot_objects')
      .select('*')
      .eq('session_id', sessionId);
    return { data, error };
  },

  async updateRobotObject(objectId, updates) {
    const { data, error } = await _supabase
      .from('robot_objects')
      .update(updates)
      .eq('id', objectId)
      .select()
      .single();
    return { data, error };
  },

  // ===== Messages =====
  async sendMessage(messageData) {
    const { data, error } = await _supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    return { data, error };
  },

  async getMessages(sessionId, limit = 200) {
    const { data, error } = await _supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);
    return { data, error };
  },

  // ===== Simulation Logs =====
  async saveSimulationLog(logData) {
    const { data, error } = await _supabase
      .from('simulation_logs')
      .insert(logData)
      .select()
      .single();
    return { data, error };
  },

  async getSimulationLogs(sessionId) {
    const { data, error } = await _supabase
      .from('simulation_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  // ===== System Settings =====
  async getSetting(key) {
    const { data, error } = await _supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    return { data, error };
  },

  async getSettings(keys) {
    const { data, error } = await _supabase
      .from('system_settings')
      .select('key, value')
      .in('key', keys);
    return { data, error };
  },

  // ===== Storage =====
  async uploadImage(bucket, path, file) {
    const { data, error } = await _supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    return { data, error };
  },

  getImageUrl(bucket, path) {
    const { data } = _supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteImage(bucket, path) {
    const { error } = await _supabase.storage.from(bucket).remove([path]);
    return { error };
  },

  // ===== Realtime Subscriptions =====
  subscribeToMessages(sessionId, callback) {
    return _supabase
      .channel(`messages:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe();
  },

  subscribeToSessionObjects(sessionId, callback) {
    return _supabase
      .channel(`objects:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'robot_objects',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe();
  },

  unsubscribe(channel) {
    if (channel) _supabase.removeChannel(channel);
  }
};

// Export for global access
window.db = db;