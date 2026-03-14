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
                    logo_url: string | null
                    directiva_image_url: string | null
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
                    logo_url?: string | null
                    directiva_image_url?: string | null
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
                    logo_url?: string | null
                    directiva_image_url?: string | null
                    emergency_numbers?: Json
                    created_at?: string
                }
            }
            memberships: {
                Row: {
                    id: string
                    organization_id: string
                    user_id: string
                    role: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active: boolean
                    joined_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    user_id: string
                    role?: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active?: boolean
                    joined_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    user_id?: string
                    role?: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
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
                    address: string | null
                    preferred_font_scale: number
                    high_contrast_mode: boolean
                    accessibility_mode: boolean
                    push_announcements: boolean
                    push_alerts: boolean
                    push_events: boolean
                    push_tickets: boolean
                    push_dues: boolean
                    push_finance: boolean
                    silent_start: string | null
                    silent_end: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    full_name?: string | null
                    rut?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    address?: string | null
                    preferred_font_scale?: number
                    high_contrast_mode?: boolean
                    accessibility_mode?: boolean
                    push_announcements?: boolean
                    push_alerts?: boolean
                    push_events?: boolean
                    push_tickets?: boolean
                    push_dues?: boolean
                    push_finance?: boolean
                    silent_start?: string | null
                    silent_end?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    full_name?: string | null
                    rut?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    address?: string | null
                    preferred_font_scale?: number
                    high_contrast_mode?: boolean
                    accessibility_mode?: boolean
                    push_announcements?: boolean
                    push_alerts?: boolean
                    push_events?: boolean
                    push_tickets?: boolean
                    push_dues?: boolean
                    push_finance?: boolean
                    silent_start?: string | null
                    silent_end?: string | null
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
                    location: string | null
                    schedule: string | null
                    expires_at: string | null
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
                    location?: string | null
                    schedule?: string | null
                    expires_at?: string | null
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
                    location?: string | null
                    schedule?: string | null
                    expires_at?: string | null
                }
            }
            announcement_replies: {
                Row: {
                    id: string
                    announcement_id: string
                    author_id: string
                    author_name: string
                    body: string
                    media_type: 'image' | 'video' | 'audio' | null
                    media_path: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    announcement_id: string
                    author_id: string
                    author_name: string
                    body: string
                    media_type?: 'image' | 'video' | 'audio' | null
                    media_path?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    announcement_id?: string
                    author_id?: string
                    author_name?: string
                    body?: string
                    media_type?: 'image' | 'video' | 'audio' | null
                    media_path?: string | null
                    created_at?: string
                }
            }
            documents: {
                Row: {
                    id: string
                    organization_id: string
                    title: string
                    doc_type: string
                    file_path: string
                    description: string | null
                    created_by: string
                    created_at: string
                    is_public: boolean
                    folder: string
                    original_file_name: string | null
                    mime_type: string | null
                    file_size_bytes: number | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    title: string
                    doc_type: string
                    file_path: string
                    description?: string | null
                    created_by: string
                    created_at?: string
                    is_public?: boolean
                    folder?: string
                    original_file_name?: string | null
                    mime_type?: string | null
                    file_size_bytes?: number | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    title?: string
                    doc_type?: string
                    file_path?: string
                    description?: string | null
                    created_by?: string
                    created_at?: string
                    is_public?: boolean
                    folder?: string
                    original_file_name?: string | null
                    mime_type?: string | null
                    file_size_bytes?: number | null
                }
            }
            tickets: {
                Row: {
                    id: string
                    organization_id: string
                    created_by: string
                    title: string
                    description: string | null
                    category: string
                    status: 'open' | 'in_progress' | 'resolved' | 'rejected'
                    assigned_to: string | null
                    tracking_code: string | null
                    attachment_path: string | null
                    last_user_viewed_at: string | null
                    last_admin_viewed_at: string | null
                    closed_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    created_by: string
                    title: string
                    description?: string | null
                    category?: string
                    status?: 'open' | 'in_progress' | 'resolved' | 'rejected'
                    assigned_to?: string | null
                    tracking_code?: string | null
                    attachment_path?: string | null
                    last_user_viewed_at?: string | null
                    last_admin_viewed_at?: string | null
                    closed_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    created_by?: string
                    title?: string
                    description?: string | null
                    category?: string
                    status?: 'open' | 'in_progress' | 'resolved' | 'rejected'
                    assigned_to?: string | null
                    tracking_code?: string | null
                    attachment_path?: string | null
                    last_user_viewed_at?: string | null
                    last_admin_viewed_at?: string | null
                    closed_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            ticket_comments: {
                Row: {
                    id: string
                    ticket_id: string
                    author_id: string
                    body: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    ticket_id: string
                    author_id: string
                    body: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    ticket_id?: string
                    author_id?: string
                    body?: string
                    created_at?: string
                }
            }
            finance_entries: {
                Row: {
                    id: string
                    organization_id: string
                    entry_type: 'income' | 'expense'
                    category: string
                    description: string | null
                    amount_cents: number
                    entry_date: string
                    attachment_path: string | null
                    created_by: string
                    approval_status: 'none' | 'pending' | 'approved' | 'rejected'
                    approved_by: string | null
                    approved_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    entry_type: 'income' | 'expense'
                    category: string
                    description?: string | null
                    amount_cents: number
                    entry_date: string
                    attachment_path?: string | null
                    created_by: string
                    approval_status?: 'none' | 'pending' | 'approved' | 'rejected'
                    approved_by?: string | null
                    approved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    entry_type?: 'income' | 'expense'
                    category?: string
                    description?: string | null
                    amount_cents?: number
                    entry_date?: string
                    attachment_path?: string | null
                    created_by?: string
                    approval_status?: 'none' | 'pending' | 'approved' | 'rejected'
                    approved_by?: string | null
                    approved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
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
            list_accessible_organizations: {
                Args: Record<string, never>
                Returns: {
                    organization_id: string
                    role: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    organization_name: string | null
                    organization_logo_url: string | null
                    organization_directiva_image_url: string | null
                }[]
            }
            get_my_membership_context: {
                Args: Record<string, never>
                Returns: {
                    organization_id: string
                    role: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    organization_name: string | null
                    organization_logo_url: string | null
                    organization_directiva_image_url: string | null
                }[]
            }
            list_organization_members: {
                Args: { p_org_id: string }
                Returns: {
                    user_id: string
                    full_name: string | null
                    email: string | null
                    role: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
                    is_active: boolean
                    joined_at: string
                }[]
            }
            list_polls: {
                Args: { p_org_id: string }
                Returns: {
                    id: string
                    question: string
                    deadline: string
                    allow_multiple: boolean
                    created_at: string
                    total_votes: number
                    options: Json
                    my_option_ids: string[]
                }[]
            }
            list_my_tickets: {
                Args: { p_org_id: string }
                Returns: {
                    id: string
                    organization_id: string
                    created_by: string
                    reporter_name: string | null
                    reporter_email: string | null
                    title: string
                    description: string
                    category: string
                    status: 'open' | 'in_progress' | 'resolved' | 'rejected'
                    tracking_code: string | null
                    attachment_path: string | null
                    created_at: string
                    updated_at: string
                    last_user_viewed_at: string | null
                    last_admin_viewed_at: string | null
                    reply_count: number
                }[]
            }
            list_organization_tickets: {
                Args: { p_org_id: string }
                Returns: {
                    id: string
                    organization_id: string
                    created_by: string
                    reporter_name: string | null
                    reporter_email: string | null
                    title: string
                    description: string
                    category: string
                    status: 'open' | 'in_progress' | 'resolved' | 'rejected'
                    tracking_code: string | null
                    attachment_path: string | null
                    created_at: string
                    updated_at: string
                    last_user_viewed_at: string | null
                    last_admin_viewed_at: string | null
                    reply_count: number
                }[]
            }
            list_ticket_comments: {
                Args: { p_ticket_id: string }
                Returns: {
                    id: string
                    ticket_id: string
                    author_id: string
                    author_name: string | null
                    author_kind: 'user' | 'admin'
                    body: string
                    created_at: string
                }[]
            }
            get_ticket_counters: {
                Args: { p_org_id: string }
                Returns: {
                    my_unread_count: number
                    admin_unread_count: number
                    open_count: number
                }[]
            }
        }
        Enums: {
            role_t: 'member' | 'director' | 'secretary' | 'treasurer' | 'president' | 'superadmin'
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
