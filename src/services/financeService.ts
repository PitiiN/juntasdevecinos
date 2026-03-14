import { supabase } from '../lib/supabase';

export type FinanceViewItem = {
    id: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    date: string;
    entryDate: string;
    approvalStatus: 'none' | 'pending' | 'approved' | 'rejected';
};

const formatDateLabel = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const mapFinanceRow = (row: {
    id: string;
    entry_type: 'income' | 'expense';
    category: string;
    description: string | null;
    amount_cents: number;
    entry_date: string;
    approval_status: 'none' | 'pending' | 'approved' | 'rejected';
}) => ({
    id: row.id,
    type: row.entry_type,
    category: row.category,
    description: row.description || '',
    amount: Math.round(row.amount_cents / 100),
    date: formatDateLabel(row.entry_date),
    entryDate: row.entry_date,
    approvalStatus: row.approval_status,
});

export const financeService = {
    async getFinances(organizationId: string) {
        const { data, error } = await supabase
            .from('finance_entries')
            .select('id, entry_type, category, description, amount_cents, entry_date, approval_status')
            .eq('organization_id', organizationId)
            .order('entry_date', { ascending: false });

        if (error) {
            throw error;
        }

        return ((data || []) as Array<{
            id: string;
            entry_type: 'income' | 'expense';
            category: string;
            description: string | null;
            amount_cents: number;
            entry_date: string;
            approval_status: 'none' | 'pending' | 'approved' | 'rejected';
        }>).map(mapFinanceRow);
    },

    async createEntry(entryData: {
        organizationId: string;
        type: 'income' | 'expense';
        category: string;
        description: string;
        amount: number;
        createdBy: string;
        entryDate?: string;
    }) {
        const { error } = await supabase
            .from('finance_entries')
            .insert({
                organization_id: entryData.organizationId,
                entry_type: entryData.type,
                category: entryData.category,
                description: entryData.description,
                amount_cents: Math.round(entryData.amount * 100),
                entry_date: entryData.entryDate || new Date().toISOString().slice(0, 10),
                created_by: entryData.createdBy,
            });

        if (error) {
            throw error;
        }
    },

    async updateEntry(id: string, updates: {
        type: 'income' | 'expense';
        category: string;
        description: string;
        amount: number;
    }) {
        const { error } = await supabase
            .from('finance_entries')
            .update({
                entry_type: updates.type,
                category: updates.category,
                description: updates.description,
                amount_cents: Math.round(updates.amount * 100),
            })
            .eq('id', id);

        if (error) {
            throw error;
        }
    },

    async deleteEntry(id: string) {
        const { error } = await supabase
            .from('finance_entries')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }
    },
};
