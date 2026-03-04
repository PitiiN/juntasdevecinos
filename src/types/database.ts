export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string
                    name: string
                    region: string | null
                    commune: string | null
                    address: string | null
                    phone: string | null
                    email: string | null
                    emergency_numbers: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    region?: string | null
                    commune?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    emergency_numbers?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    region?: string | null
                    commune?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    emergency_numbers?: Json
                    created_at?: string
                }
            }
            memberships: {
                Row: {
                    id: string
                    organization_id: string
                    user_id: string
                    role: 'resident' | 'member' | 'moderator' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active: boolean
                    joined_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    user_id: string
                    role?: 'resident' | 'member' | 'moderator' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active?: boolean
                    joined_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    user_id?: string
                    role?: 'resident' | 'member' | 'moderator' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active?: boolean
                    joined_at?: string
                }
            }
            profiles: {
                Row: {
                    user_id: string
                    full_name: string | null
                    rut: string | null
                    phone: string | null
                    avatar_url: string | null
                    preferred_font_scale: number
                    high_contrast_mode: boolean
                    accessibility_mode: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    full_name?: string | null
                    rut?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    preferred_font_scale?: number
                    high_contrast_mode?: boolean
                    accessibility_mode?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    full_name?: string | null
                    rut?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    preferred_font_scale?: number
                    high_contrast_mode?: boolean
                    accessibility_mode?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            announcements: {
                Row: {
                    id: string
                    organization_id: string
                    title: string
                    body: string
                    priority: 'normal' | 'important'
                    created_by: string
                    published_at: string
                    is_deleted: boolean
                }
                Insert: {
                    id?: string
                    organization_id: string
                    title: string
                    body: string
                    priority?: 'normal' | 'important'
                    created_by: string
                    published_at?: string
                    is_deleted?: boolean
                }
                Update: {
                    id?: string
                    organization_id?: string
                    title?: string
                    body?: string
                    priority?: 'normal' | 'important'
                    created_by?: string
                    published_at?: string
                    is_deleted?: boolean
                }
            }
            // Added other tables minimally to avoid giant file right now
            // This can be auto-generated via Supabase CLI eventually
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_member_of: {
                Args: { org: string }
                Returns: boolean
            }
            has_role: {
                Args: { org: string, roles: string[] }
                Returns: boolean
            }
        }
        Enums: {
            role_t: 'resident' | 'member' | 'moderator' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
            ticket_status_t: 'open' | 'in_progress' | 'resolved' | 'rejected'
            announcement_priority_t: 'normal' | 'important'
            alert_status_t: 'pending' | 'published' | 'discarded'
            finance_type_t: 'income' | 'expense'
            approval_status_t: 'none' | 'pending' | 'approved' | 'rejected'
            notification_channel_t: 'push'
            notification_type_t: 'announcement' | 'alert' | 'event' | 'ticket' | 'dues' | 'finance'
        }
    }
}
