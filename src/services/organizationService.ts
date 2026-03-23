import { supabase } from '../lib/supabase';

export type OrganizationRecord = {
    id: string;
    name: string;
    region: string | null;
    commune: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    directiva_image_url: string | null;
    emergency_numbers: Record<string, string>;
    created_at: string;
};

export type CreateOrganizationInput = {
    name: string;
    region?: string;
    commune?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
    directivaImageUrl?: string | null;
    emergencyNumbers?: Record<string, string>;
};

export type UpdateOrganizationInput = {
    name?: string;
    region?: string;
    commune?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
    directivaImageUrl?: string | null;
    emergencyNumbers?: Record<string, string>;
};

const asNullableText = (value?: string | null) => {
    const trimmed = (value || '').trim();
    return trimmed.length > 0 ? trimmed : null;
};

const isCreateOrganizationFnMissing = (error: any) => {
    const message = (error?.message || '').toString();
    return error?.code === 'PGRST202' || /Could not find the function public\.create_organization/i.test(message);
};

export const organizationService = {
    async getOrganizationById(organizationId: string): Promise<OrganizationRecord> {
        const { data, error } = await supabase
            .from('organizations')
            .select('id, name, region, commune, address, phone, email, logo_url, directiva_image_url, emergency_numbers, created_at')
            .eq('id', organizationId)
            .single();

        if (error) {
            throw error;
        }

        return data as OrganizationRecord;
    },

    async updateOrganization(organizationId: string, input: UpdateOrganizationInput): Promise<OrganizationRecord> {
        const payload: any = {
            ...(input.name !== undefined ? { name: asNullableText(input.name) } : {}),
            ...(input.region !== undefined ? { region: asNullableText(input.region) } : {}),
            ...(input.commune !== undefined ? { commune: asNullableText(input.commune) } : {}),
            ...(input.address !== undefined ? { address: asNullableText(input.address) } : {}),
            ...(input.phone !== undefined ? { phone: asNullableText(input.phone) } : {}),
            ...(input.email !== undefined ? { email: asNullableText(input.email)?.toLowerCase() ?? null } : {}),
            ...(input.logoUrl !== undefined ? { logo_url: asNullableText(input.logoUrl) } : {}),
            ...(input.directivaImageUrl !== undefined ? { directiva_image_url: asNullableText(input.directivaImageUrl) } : {}),
            ...(input.emergencyNumbers !== undefined ? { emergency_numbers: input.emergencyNumbers || {} } : {}),
        };

        const { data, error } = await supabase
            .from('organizations')
            .update(payload)
            .eq('id', organizationId)
            .select('id, name, region, commune, address, phone, email, logo_url, directiva_image_url, emergency_numbers, created_at')
            .single();

        if (error) {
            throw error;
        }

        return data as OrganizationRecord;
    },

    async createOrganization(input: CreateOrganizationInput): Promise<OrganizationRecord> {
        const basePayload = {
            p_name: input.name.trim(),
            p_region: asNullableText(input.region),
            p_commune: asNullableText(input.commune),
            p_phone: asNullableText(input.phone),
            p_email: asNullableText(input.email),
            p_logo_url: asNullableText(input.logoUrl),
            p_directiva_image_url: asNullableText(input.directivaImageUrl),
            p_emergency_numbers: input.emergencyNumbers || {},
        };
        const addressValue = asNullableText(input.address);

        let { data, error } = await supabase.rpc('create_organization', {
            ...basePayload,
            p_address: addressValue,
        });

        // Backward compatibility for environments with legacy RPC arg name `p_addres`.
        if (isCreateOrganizationFnMissing(error)) {
            const retry = await supabase.rpc('create_organization', {
                ...basePayload,
                p_addres: addressValue,
            } as any);
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            if (isCreateOrganizationFnMissing(error)) {
                throw new Error('No se encontró la función create_organization en el backend. Aplica migraciones pendientes y recarga la caché de esquema.');
            }
            throw error;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.id) {
            throw new Error('No se pudo crear la organización.');
        }

        return row as OrganizationRecord;
    },
};
