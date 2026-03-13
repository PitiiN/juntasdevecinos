import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnnouncementReply = {
    id: string; message: string; userName: string; date: string;
    from: 'admin' | 'user';
    mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio';
};

export type FavorReply = {
    id: string;
    message: string;
    author: string;
    date: string;
    user_id: string;
};

export type Announcement = {
    id: string; title: string; body: string; priority: 'normal' | 'important'; date: string;
    schedule?: string; location?: string;
    expiresAt?: string | null; // null or undefined = "No aplica" (always visible)
    replies: AnnouncementReply[];
};

export type PollOption = { id: string; text: string; votes: number; };
export type Poll = {
    id: string; question: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio';
    deadline: string; options: PollOption[]; votedBy: string[];
    userVotes?: Record<string, string[]>;
    allowMultiple: boolean;
    pushEnabled: boolean; date: string;
};

export type Favor = {
    id: string; title: string; description: string; author: string; userEmail: string; date: string;
    createdAt: number; resolved: boolean;
    replies?: FavorReply[];
};

export type SolicitudReply = {
    id: string; message: string; from: 'admin' | 'user'; date: string;
};

export type Solicitud = {
    id: string; title: string; description: string; category: string; user: string; userEmail: string; date: string;
    status: 'Abierta' | 'En proceso' | 'Resuelta' | 'Rechazada';
    hasImage: boolean; imageUri?: string; replies: SolicitudReply[];
    seenByAdmin: boolean; seenByUser: boolean;
    trackingNumber: string;
};

export type OrgSettings = {
    name: string; address: string; phone: string; social: string;
};

export type Document = {
    id: string; title: string; type: string; date: string; emoji: string; fileUri?: string;
    folder?: 'Actas' | 'Documentos relativos' | 'Documentos contables' | 'General';
};

export type Member = {
    id: string; name: string; email: string; role: string; active: boolean;
};

export type MemberDue = {
    id: string; memberId: string; memberName: string; month: number; year: number; amount: number;
    status: 'paid' | 'pending' | 'overdue' | 'PENDING_VALIDATION' | 'REJECTED';
    paidDate?: string; receiptUri?: string; rejectionReason?: string; adminComment?: string;
    voucherId?: string; // New field for Payment Voucher
};

export type FinanceEntry = {
    id: string; type: 'income' | 'expense'; category: string; description: string; amount: number; date: string;
};

export type EventItem = {
    id: string; title: string; date: string; location: string; emoji: string; month: number;
    description?: string;
    lat?: number;
    lng?: number;
};

export type MapPinReview = {
    id: string; userId: string; userName: string; rating: number; comment: string; date: string;
};

export type MapPin = {
    id: string; title: string; description: string; category: 'servicio' | 'punto_interes';
    lat: number; lng: number; emoji: string;
    subcategory?: string; // Salud, Deporte, Servicios para el hogar, Comida, Otro
    contactWhatsapp?: string;
    socialInstagram?: string;
    socialFacebook?: string;
    reviews?: MapPinReview[];
};

type AppStore = {
    announcements: Announcement[];
    solicitudes: Solicitud[];
    documents: Document[];
    members: Member[];
    finances: FinanceEntry[];
    memberDues: MemberDue[];
    seenAvisosCount: number;
    seenDocsCount: number;
    mapPins: MapPin[];
    orgSettings: OrgSettings;
    polls: Poll[];
    favors: Favor[];
    events: EventItem[];

    addEvent: (e: Omit<EventItem, 'id'>) => void;
    updateEvent: (id: string, updates: Partial<EventItem>) => void;
    removeEvent: (id: string) => void;

    addAnnouncement: (a: Omit<Announcement, 'id' | 'date' | 'replies'>) => void;
    updateAnnouncement: (id: string, updates: Partial<Announcement>) => void;
    removeAnnouncement: (id: string) => void;
    addAnnouncementReply: (announcementId: string, message: string, userName: string, from: 'admin' | 'user', mediaUrl?: string, mediaType?: 'image' | 'video' | 'audio') => void;

    addPoll: (p: Omit<Poll, 'id' | 'date' | 'votedBy' | 'userVotes'>) => void;
    votePoll: (pollId: string, optionId: string, userId: string) => void;
    removePoll: (id: string) => void;

    addFavor: (f: Omit<Favor, 'id' | 'date' | 'createdAt' | 'resolved'>) => void;
    updateFavor: (id: string, updates: Partial<Favor>) => void;
    removeFavor: (id: string) => void;

    addSolicitud: (s: Omit<Solicitud, 'id' | 'date' | 'status' | 'replies' | 'seenByAdmin' | 'seenByUser' | 'trackingNumber'>) => void;
    removeSolicitud: (id: string) => void;
    updateSolicitudStatus: (id: string, status: Solicitud['status']) => void;
    addSolicitudReply: (solicitudId: string, message: string, from: 'admin' | 'user') => void;
    markSolicitudSeen: (id: string, by: 'admin' | 'user') => void;

    addDocument: (d: Omit<Document, 'id' | 'date'>) => void;
    removeDocument: (id: string) => void;

    addFinanceEntry: (f: Omit<FinanceEntry, 'id'>) => void;
    updateFinanceEntry: (id: string, updates: Partial<FinanceEntry>) => void;
    removeFinanceEntry: (id: string) => void;

    updateMemberDue: (id: string, status: MemberDue['status'], paidDate?: string) => void;
    submitDueReceipt: (id: string, receiptUri: string) => void;
    rejectDue: (id: string, reason: string, comment?: string) => void;
    markAvisosSeen: () => void;
    markDocsSeen: () => void;
    addMapPin: (p: Omit<MapPin, 'id'>) => void;
    removeMapPin: (id: string) => void;
    updateMapPin: (id: string, updates: Partial<MapPin>) => void;
    addMapPinReview: (pinId: string, review: Omit<MapPinReview, 'id' | 'date'>) => void;
    updateOrgSettings: (s: Partial<OrgSettings>) => void;
    setFavors: (favors: Favor[]) => void;
    setMapPins: (pins: MapPin[]) => void;
    setMembers: (members: Member[]) => void;
    setSolicitudes: (solicitudes: Solicitud[]) => void;
    setAnnouncements: (announcements: Announcement[]) => void;
    setDocuments: (documents: Document[]) => void;
    setEvents: (events: EventItem[]) => void;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const now = () => {
    const d = new Date();
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            announcements: [],
            solicitudes: [],
            documents: [],
            members: [],
            finances: [],
            memberDues: [],
            seenAvisosCount: 0,
            seenDocsCount: 0,
            polls: [],
            favors: [],
            events: [],
            mapPins: [],
            orgSettings: { name: 'JJVV Mi Barrio', address: '', phone: '', social: '' },

            addAnnouncement: (a) => set((state) => ({
                announcements: [{ ...a, id: Date.now().toString(), date: now(), replies: [] }, ...state.announcements],
            })),
            updateAnnouncement: (id, updates) => set((state) => ({
                announcements: state.announcements.map(a => a.id === id ? { ...a, ...updates } : a),
            })),
            removeAnnouncement: (id) => set((state) => ({
                announcements: state.announcements.filter(a => a.id !== id),
            })),
            addAnnouncementReply: (announcementId, message, userName, from, mediaUrl, mediaType) => set((state) => ({
                announcements: state.announcements.map(a => a.id === announcementId ? {
                    ...a,
                    replies: [...(a.replies || []), { id: Date.now().toString(), message, userName, from, date: now(), mediaUrl, mediaType }]
                } : a),
            })),

            addPoll: (p) => set((state) => ({ polls: [{ ...p, id: Date.now().toString(), date: now(), votedBy: [], userVotes: {} }, ...state.polls] })),
            votePoll: (pollId, optionId, userId) => set((state) => ({
                polls: state.polls.map(p => {
                    if (p.id !== pollId) return p;
                    
                    const currentVotes = p.userVotes?.[userId] || [];
                    const allowMultiple = p.allowMultiple;
                    
                    let newVotes: string[] = [];
                    let newOptions = p.options.map(o => ({ ...o }));

                    if (allowMultiple) {
                        // Toggle logic
                        if (currentVotes.includes(optionId)) {
                            newVotes = currentVotes.filter(v => v !== optionId);
                            const optIndex = newOptions.findIndex(o => o.id === optionId);
                            if (optIndex >= 0) newOptions[optIndex].votes = Math.max(0, newOptions[optIndex].votes - 1);
                        } else {
                            newVotes = [...currentVotes, optionId];
                            const optIndex = newOptions.findIndex(o => o.id === optionId);
                            if (optIndex >= 0) newOptions[optIndex].votes++;
                        }
                    } else {
                        // Single choice logic
                        if (currentVotes.includes(optionId)) return p; // Already voted for this

                        // Remove previous vote count if exists
                        if (currentVotes.length > 0) {
                            const prevVoteId = currentVotes[0];
                            const prevOptIndex = newOptions.findIndex(o => o.id === prevVoteId);
                            if (prevOptIndex >= 0) newOptions[prevOptIndex].votes = Math.max(0, newOptions[prevOptIndex].votes - 1);
                        }

                        newVotes = [optionId];
                        const newOptIndex = newOptions.findIndex(o => o.id === optionId);
                        if (newOptIndex >= 0) newOptions[newOptIndex].votes++;
                    }

                    return {
                        ...p,
                        votedBy: p.votedBy.includes(userId) ? p.votedBy : [...p.votedBy, userId],
                        userVotes: { ...(p.userVotes || {}), [userId]: newVotes },
                        options: newOptions
                    };
                })
            })),
            removePoll: (id) => set((state) => ({ polls: state.polls.filter(p => p.id !== id) })),

            addFavor: (f) => set((state) => ({ favors: [{ ...f, id: Date.now().toString(), date: now(), createdAt: Date.now(), resolved: false }, ...state.favors] })),
            updateFavor: (id, updates) => set((state) => ({ favors: state.favors.map(f => f.id === id ? { ...f, ...updates } : f) })),
            removeFavor: (id) => set((state) => ({ favors: state.favors.filter(f => f.id !== id) })),

            addEvent: (e) => set((state) => ({ events: [{ ...e, id: Date.now().toString() }, ...state.events] })),
            updateEvent: (id, updates) => set((state) => ({ events: state.events.map(ev => ev.id === id ? { ...ev, ...updates } : ev) })),
            removeEvent: (id) => set((state) => ({ events: state.events.filter(ev => ev.id !== id) })),

            addSolicitud: (s) => set((state) => {
                let trackingNumber = '';
                let isUnique = false;
                while (!isUnique) {
                    trackingNumber = `SOL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
                    isUnique = !state.solicitudes.some(sol => sol.trackingNumber === trackingNumber);
                }
                return {
                    solicitudes: [{ ...s, category: s.category || 'Otro', id: Date.now().toString(), date: now(), status: 'Abierta', replies: [], seenByAdmin: false, seenByUser: true, trackingNumber }, ...state.solicitudes],
                };
            }),
            removeSolicitud: (id) => set((state) => ({
                solicitudes: state.solicitudes.filter(s => s.id !== id),
            })),
            updateSolicitudStatus: (id, status) => set((state) => ({
                solicitudes: state.solicitudes.map(s => s.id === id ? { ...s, status, seenByUser: false } : s),
            })),
            addSolicitudReply: (solicitudId, message, from) => set((state) => ({
                solicitudes: state.solicitudes.map(s => s.id === solicitudId ? {
                    ...s,
                    replies: [...s.replies, { id: Date.now().toString(), message, from, date: now() }],
                    seenByAdmin: from === 'admin',
                    seenByUser: from === 'user',
                } : s),
            })),
            markSolicitudSeen: (id, by) => set((state) => ({
                solicitudes: state.solicitudes.map(s => s.id === id ? { ...s, [by === 'admin' ? 'seenByAdmin' : 'seenByUser']: true } : s),
            })),

            addDocument: (d) => set((state) => {
                const date = new Date();
                const dateStr = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
                return {
                    documents: [{ ...d, id: Date.now().toString(), date: dateStr, folder: d.folder || 'General' }, ...state.documents],
                };
            }),
            removeDocument: (id) => set((state) => ({
                documents: state.documents.filter(d => d.id !== id),
            })),

            addFinanceEntry: (f) => set((state) => ({
                finances: [{ ...f, id: Date.now().toString() }, ...state.finances],
            })),
            updateFinanceEntry: (id, updates) => set((state) => ({
                finances: state.finances.map(f => f.id === id ? { ...f, ...updates } : f),
            })),
            removeFinanceEntry: (id) => set((state) => ({
                finances: state.finances.filter(f => f.id !== id),
            })),

            updateMemberDue: (id: string, status: MemberDue['status'], paidDate?: string) => {
        set(state => ({
            memberDues: state.memberDues.map(d => {
                if (d.id === id) {
                    const isNewPayment = status === 'paid' && d.status !== 'paid';
                    const voucherId = isNewPayment ? `V-${d.year}-${Math.floor(1000 + Math.random() * 9000)}` : d.voucherId;
                    return { ...d, status, paidDate, voucherId };
                }
                return d;
            })
        }));
    },
            submitDueReceipt: (id, receiptUri) => set((state) => ({
                memberDues: state.memberDues.map(d => d.id === id ? { ...d, status: 'PENDING_VALIDATION', receiptUri } : d),
            })),
            rejectDue: (id, reason, comment) => set((state) => ({
                memberDues: state.memberDues.map(d => d.id === id ? { ...d, status: 'REJECTED', rejectionReason: reason, adminComment: comment } : d),
            })),
            markAvisosSeen: () => set((state) => ({ seenAvisosCount: state.announcements.length })),
            markDocsSeen: () => set((state) => ({ seenDocsCount: state.documents.length })),
            addMapPin: (p) => set((state) => ({
                mapPins: [...state.mapPins, { ...p, id: Date.now().toString() }],
            })),
            removeMapPin: (id) => set((state) => ({
                mapPins: state.mapPins.filter(p => p.id !== id),
            })),
            updateMapPin: (id, updates) => set((state) => ({
                mapPins: state.mapPins.map(p => p.id === id ? { ...p, ...updates } : p),
            })),
            addMapPinReview: (pinId, review) => set((state) => ({
                mapPins: state.mapPins.map(p => p.id === pinId ? {
                    ...p,
                    reviews: [...(p.reviews || []), { ...review, id: Date.now().toString(), date: now() }]
                } : p),
            })),
            updateOrgSettings: (s) => set((state) => ({
                orgSettings: { ...state.orgSettings, ...s },
            })),
            setFavors: (favors) => set({ favors }),
            setMapPins: (pins) => set({ mapPins: pins }),
            setMembers: (members) => set({ members }),
            setSolicitudes: (solicitudes) => set({ solicitudes }),
            setAnnouncements: (announcements) => set({ announcements }),
            setDocuments: (documents) => set({ documents }),
            setEvents: (events) => set({ events }),
        }),
        {
            name: 'jjvv-app-storage-v7',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export const formatCLP = (amount: number) => `$${amount.toLocaleString('es-CL')}`;
