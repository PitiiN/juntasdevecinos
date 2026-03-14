import { supabase } from '../lib/supabase';

export type PollOption = {
    id: string;
    text: string;
    votes: number;
};

export type CommunityPoll = {
    id: string;
    question: string;
    deadline: string;
    allowMultiple: boolean;
    createdAt: string;
    totalVotes: number;
    options: PollOption[];
    myOptionIds: string[];
};

export const pollService = {
    async getPolls(organizationId: string): Promise<CommunityPoll[]> {
        const { data, error } = await supabase.rpc('list_polls', {
            p_org_id: organizationId,
        });

        if (error) throw error;

        return ((data || []) as any[]).map((poll) => ({
            id: poll.id,
            question: poll.question,
            deadline: poll.deadline,
            allowMultiple: poll.allow_multiple,
            createdAt: poll.created_at,
            totalVotes: poll.total_votes || 0,
            options: Array.isArray(poll.options)
                ? poll.options.map((option: any) => ({
                    id: option.id,
                    text: option.text,
                    votes: option.votes || 0,
                }))
                : [],
            myOptionIds: poll.my_option_ids || [],
        }));
    },

    async createPoll(params: {
        organizationId: string;
        userId: string;
        question: string;
        deadline: string;
        allowMultiple: boolean;
        options: string[];
    }) {
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            .insert({
                organization_id: params.organizationId,
                created_by: params.userId,
                question: params.question,
                deadline: params.deadline,
                allow_multiple: params.allowMultiple,
            })
            .select()
            .single();

        if (pollError) throw pollError;

        const { error: optionsError } = await supabase
            .from('poll_options')
            .insert(params.options.map((option, index) => ({
                poll_id: poll.id,
                option_text: option,
                sort_order: index,
            })));

        if (optionsError) throw optionsError;
        return poll;
    },

    async deletePoll(id: string) {
        const { error } = await supabase
            .from('polls')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) throw error;
    },

    async submitVote(params: {
        pollId: string;
        optionId: string;
        userId: string;
        allowMultiple: boolean;
        currentVotes: string[];
    }) {
        if (params.allowMultiple && params.currentVotes.includes(params.optionId)) {
            const { error } = await supabase
                .from('poll_votes')
                .delete()
                .eq('poll_id', params.pollId)
                .eq('user_id', params.userId)
                .eq('option_id', params.optionId);

            if (error) throw error;
            return;
        }

        if (!params.allowMultiple) {
            const { error: deleteError } = await supabase
                .from('poll_votes')
                .delete()
                .eq('poll_id', params.pollId)
                .eq('user_id', params.userId);

            if (deleteError) throw deleteError;
        }

        const { error } = await supabase
            .from('poll_votes')
            .insert({
                poll_id: params.pollId,
                option_id: params.optionId,
                user_id: params.userId,
            });

        if (error) throw error;
    },
};
