import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Validate Supabase configuration
if (
  !process.env.SUPABASE_URL ||
  process.env.SUPABASE_URL === "your_supabase_url_here"
) {
  console.warn("Supabase URL not configured. Using in-memory storage.");
}

if (
  !process.env.SUPABASE_KEY ||
  process.env.SUPABASE_KEY === "your_supabase_anon_key_here"
) {
  console.warn("Supabase Key not configured. Using in-memory storage.");
}

// Initialize Supabase client
let supabase = null;

if (
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_KEY &&
  process.env.SUPABASE_URL !== "your_supabase_url_here" &&
  process.env.SUPABASE_KEY !== "your_supabase_anon_key_here"
) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  console.log("Supabase client initialized");
} else {
  console.log("Running without Supabase - using in-memory storage");
}

export default supabase;

// Helper functions for database operations
export const db = {
  // Users operations
  async getUser(userId) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Handle PGRST116 error (no rows found) gracefully
        if (error.code === "PGRST116") {
          console.log(
            `No user found for ID: ${userId} (this is normal for new users)`
          );
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },

  async createUser(userId, userData) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            user_id: userId,
            name: userData.name,
            email: userData.email,
            entity_id: userData.entityId,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  },

  async updateUser(userId, updates) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  },

  // Connections operations
  async saveConnection(userId, entityId, connectionData) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("connections")
        .upsert([
          {
            user_id: userId,
            entity_id: entityId,
            app_name: connectionData.appName || "googlecalendar",
            status: connectionData.status || "active",
            metadata: connectionData.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error saving connection:", error);
      return null;
    }
  },

  async getConnection(userId) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (error) {
        // Handle PGRST116 error (no rows found) gracefully
        if (error.code === "PGRST116") {
          console.log(
            `No connection found for user: ${userId} (this is normal for new users)`
          );
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error getting connection:", error);
      return null;
    }
  },

  // Meetings cache operations
  async cacheMeetings(userId, meetingType, meetings) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("meetings_cache")
        .upsert([
          {
            user_id: userId,
            meeting_type: meetingType,
            meetings_data: meetings,
            cached_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error caching meetings:", error);
      return null;
    }
  },

  async getCachedMeetings(userId, meetingType, maxAge = 300000) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("meetings_cache")
        .select("*")
        .eq("user_id", userId)
        .eq("meeting_type", meetingType)
        .single();

      if (error) throw error;

      // Check if cache is still valid (default 5 minutes)
      const cacheAge = Date.now() - new Date(data.cached_at).getTime();
      if (cacheAge > maxAge) {
        return null; // Cache expired
      }

      return data.meetings_data;
    } catch (error) {
      return null; // No cache found
    }
  },

  // AI Summaries operations
  async saveSummary(meetingId, userId, summary, isMock = false) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("ai_summaries")
        .upsert([
          {
            meeting_id: meetingId,
            user_id: userId,
            summary_text: summary,
            is_mock: isMock,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error saving summary:", error);
      return null;
    }
  },

  async getSummary(meetingId, userId) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null; // No summary found
    }
  },

  // Analytics operations
  async logEvent(userId, eventType, eventData) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("analytics_events")
        .insert([
          {
            user_id: userId,
            event_type: eventType,
            event_data: eventData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error logging event:", error);
      return null;
    }
  },
};
