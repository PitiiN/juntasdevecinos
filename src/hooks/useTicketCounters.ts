import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ticketService, TicketCounters } from '../services/ticketService';

const emptyCounters: TicketCounters = {
    myUnreadCount: 0,
    adminUnreadCount: 0,
    openCount: 0,
};

export const useTicketCounters = (organizationId: string | null) => {
    const [counters, setCounters] = useState<TicketCounters>(emptyCounters);

    const loadCounters = useCallback(async () => {
        if (!organizationId) {
            setCounters(emptyCounters);
            return;
        }

        try {
            const nextCounters = await ticketService.getCounters(organizationId);
            setCounters(nextCounters);
        } catch (error) {
            console.error('Error loading ticket counters:', error);
            setCounters(emptyCounters);
        }
    }, [organizationId]);

    useEffect(() => {
        void loadCounters();
    }, [loadCounters]);

    useFocusEffect(
        useCallback(() => {
            void loadCounters();
        }, [loadCounters]),
    );

    return {
        ...counters,
        refreshTicketCounters: loadCounters,
    };
};
