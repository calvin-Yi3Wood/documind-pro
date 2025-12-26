/**
 * Supabase 数据库类型定义
 *
 * 与 SQL 迁移文件对应的 TypeScript 类型
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          email_verified: string | null;
          image: string | null;
          password_hash: string | null;
          provider: 'credentials' | 'github' | 'google';
          provider_account_id: string | null;
          subscription: 'free' | 'pro' | 'enterprise';
          subscription_expires_at: string | null;
          monthly_ai_quota: number;
          monthly_ai_used: number;
          quota_reset_at: string;
          storage_quota: number;
          storage_used: number;
          settings: Json;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          is_active: boolean;
          metadata: Json;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email: string;
          email_verified?: string | null;
          image?: string | null;
          password_hash?: string | null;
          provider?: 'credentials' | 'github' | 'google';
          provider_account_id?: string | null;
          subscription?: 'free' | 'pro' | 'enterprise';
          subscription_expires_at?: string | null;
          monthly_ai_quota?: number;
          monthly_ai_used?: number;
          quota_reset_at?: string;
          storage_quota?: number;
          storage_used?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          is_active?: boolean;
          metadata?: Json;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          email_verified?: string | null;
          image?: string | null;
          password_hash?: string | null;
          provider?: 'credentials' | 'github' | 'google';
          provider_account_id?: string | null;
          subscription?: 'free' | 'pro' | 'enterprise';
          subscription_expires_at?: string | null;
          monthly_ai_quota?: number;
          monthly_ai_used?: number;
          quota_reset_at?: string;
          storage_quota?: number;
          storage_used?: number;
          settings?: Json;
          updated_at?: string;
          last_login_at?: string | null;
          is_active?: boolean;
          metadata?: Json;
        };
      };

      documents: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          title: string;
          content: string;
          type: 'markdown' | 'ppt' | 'doc' | 'sheet' | 'canvas';
          version: number;
          version_history: Json;
          is_shared: boolean;
          share_link: string | null;
          share_permission: 'view' | 'comment' | 'edit';
          sync_status: 'synced' | 'pending' | 'conflict' | 'error';
          last_synced_at: string;
          local_hash: string | null;
          word_count: number;
          char_count: number;
          tags: string[];
          ai_summary: string | null;
          ai_keywords: string[] | null;
          is_pinned: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          last_accessed_at: string;
          is_deleted: boolean;
          deleted_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          title?: string;
          content?: string;
          type?: 'markdown' | 'ppt' | 'doc' | 'sheet' | 'canvas';
          version?: number;
          version_history?: Json;
          is_shared?: boolean;
          share_link?: string | null;
          share_permission?: 'view' | 'comment' | 'edit';
          sync_status?: 'synced' | 'pending' | 'conflict' | 'error';
          last_synced_at?: string;
          local_hash?: string | null;
          word_count?: number;
          char_count?: number;
          tags?: string[];
          ai_summary?: string | null;
          ai_keywords?: string[] | null;
          is_pinned?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_accessed_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          title?: string;
          content?: string;
          type?: 'markdown' | 'ppt' | 'doc' | 'sheet' | 'canvas';
          version?: number;
          version_history?: Json;
          is_shared?: boolean;
          share_link?: string | null;
          share_permission?: 'view' | 'comment' | 'edit';
          sync_status?: 'synced' | 'pending' | 'conflict' | 'error';
          last_synced_at?: string;
          local_hash?: string | null;
          tags?: string[];
          ai_summary?: string | null;
          ai_keywords?: string[] | null;
          is_pinned?: boolean;
          sort_order?: number;
          updated_at?: string;
          last_accessed_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          metadata?: Json;
        };
      };

      folders: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          name: string;
          color: string;
          icon: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          name: string;
          color?: string;
          icon?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          name?: string;
          color?: string;
          icon?: string;
          sort_order?: number;
          updated_at?: string;
          metadata?: Json;
        };
      };

      ai_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string | null;
          model: string | null;
          provider: string | null;
          request_type: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          image_count: number;
          image_resolution: string | null;
          usage_units: number;
          response_status: 'success' | 'error' | 'timeout' | 'rate_limited';
          response_time_ms: number | null;
          error_message: string | null;
          request_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_name?: string | null;
          model?: string | null;
          provider?: string | null;
          request_type: string;
          input_tokens?: number;
          output_tokens?: number;
          image_count?: number;
          image_resolution?: string | null;
          usage_units?: number;
          response_status?: 'success' | 'error' | 'timeout' | 'rate_limited';
          response_time_ms?: number | null;
          error_message?: string | null;
          request_metadata?: Json;
          created_at?: string;
        };
        Update: {
          skill_name?: string | null;
          model?: string | null;
          provider?: string | null;
          request_type?: string;
          input_tokens?: number;
          output_tokens?: number;
          image_count?: number;
          image_resolution?: string | null;
          usage_units?: number;
          response_status?: 'success' | 'error' | 'timeout' | 'rate_limited';
          response_time_ms?: number | null;
          error_message?: string | null;
          request_metadata?: Json;
        };
      };

      knowledge_sources: {
        Row: {
          id: string;
          user_id: string;
          knowledge_base_id: string | null;
          title: string;
          type: 'pdf' | 'url' | 'text' | 'file' | 'youtube' | 'notion' | 'github';
          source_url: string | null;
          file_path: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          mime_type: string | null;
          content: string | null;
          summary: string | null;
          process_status: 'pending' | 'processing' | 'completed' | 'failed';
          process_error: string | null;
          processed_at: string | null;
          embedding_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
          chunk_count: number;
          reference_count: number;
          last_referenced_at: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          is_deleted: boolean;
          deleted_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          knowledge_base_id?: string | null;
          title: string;
          type: 'pdf' | 'url' | 'text' | 'file' | 'youtube' | 'notion' | 'github';
          source_url?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          content?: string | null;
          summary?: string | null;
          process_status?: 'pending' | 'processing' | 'completed' | 'failed';
          process_error?: string | null;
          processed_at?: string | null;
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
          chunk_count?: number;
          reference_count?: number;
          last_referenced_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          metadata?: Json;
        };
        Update: {
          knowledge_base_id?: string | null;
          title?: string;
          type?: 'pdf' | 'url' | 'text' | 'file' | 'youtube' | 'notion' | 'github';
          source_url?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          content?: string | null;
          summary?: string | null;
          process_status?: 'pending' | 'processing' | 'completed' | 'failed';
          process_error?: string | null;
          processed_at?: string | null;
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
          chunk_count?: number;
          tags?: string[];
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          metadata?: Json;
        };
      };
    };

    Views: {
      monthly_usage_summary: {
        Row: {
          user_id: string;
          month: string;
          total_requests: number;
          total_units: number;
          chat_units: number;
          image_units: number;
          total_input_tokens: number;
          total_output_tokens: number;
          avg_response_time: number;
          success_rate: number;
        };
      };
      daily_usage_summary: {
        Row: {
          user_id: string;
          day: string;
          total_requests: number;
          total_units: number;
          total_input_tokens: number;
          total_output_tokens: number;
        };
      };
    };

    Functions: {
      check_user_quota: {
        Args: { user_id: string };
        Returns: boolean;
      };
      increment_ai_usage: {
        Args: { user_id: string; amount?: number };
        Returns: boolean;
      };
      get_subscription_limits: {
        Args: { sub_type: string };
        Returns: {
          ai_quota: number;
          storage_quota: number;
          max_documents: number;
          max_collaborators: number;
        }[];
      };
      log_ai_usage: {
        Args: {
          p_user_id: string;
          p_skill_name?: string;
          p_model?: string;
          p_provider?: string;
          p_request_type: string;
          p_input_tokens?: number;
          p_output_tokens?: number;
          p_usage_units?: number;
          p_response_status?: string;
          p_response_time_ms?: number;
          p_error_message?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      get_user_monthly_stats: {
        Args: { p_user_id: string };
        Returns: {
          total_requests: number;
          total_units: number;
          chat_requests: number;
          image_requests: number;
          total_tokens: number;
          avg_response_time: number;
          success_rate: number;
        }[];
      };
      search_knowledge_sources: {
        Args: {
          p_user_id: string;
          p_query: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          title: string;
          type: string;
          summary: string;
          relevance: number;
        }[];
      };
    };
  };
}

// 便捷类型别名
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

export type Folder = Database['public']['Tables']['folders']['Row'];
export type FolderInsert = Database['public']['Tables']['folders']['Insert'];
export type FolderUpdate = Database['public']['Tables']['folders']['Update'];

export type AIUsageLog = Database['public']['Tables']['ai_usage_logs']['Row'];
export type AIUsageLogInsert = Database['public']['Tables']['ai_usage_logs']['Insert'];

export type KnowledgeSource = Database['public']['Tables']['knowledge_sources']['Row'];
export type KnowledgeSourceInsert = Database['public']['Tables']['knowledge_sources']['Insert'];
export type KnowledgeSourceUpdate = Database['public']['Tables']['knowledge_sources']['Update'];
