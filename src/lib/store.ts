import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnnouncementReply = {
    id: string; message: string; userName: string; date: string;
    from: 'admin' | 'user';
    mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio';
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
    userVotes?: Record<string, string>;
    pushEnabled: boolean; date: string;
};

export type Favor = {
    id: string; title: string; description: string; author: string; userEmail: string; date: string;
    createdAt: number; resolved: boolean;
};

export type SolicitudReply = {
    id: string; message: string; from: 'admin' | 'user'; date: string;
};

export type Solicitud = {
    id: string; title: string; description: string; category: string; user: string; userEmail: string; date: string;
    status: 'Abierta' | 'En proceso' | 'Resuelta' | 'Rechazada';
    hasImage: boolean; imageUri?: string; replies: SolicitudReply[];
    seenByAdmin: boolean; seenByUser: boolean;
};

export type OrgSettings = {
    name: string; address: string; phone: string; social: string;
};

export type Document = {
    id: string; title: string; type: string; date: string; emoji: string; fileUri?: string;
};

export type Member = {
    id: string; name: string; email: string; role: string; active: boolean;
};

export type MemberDue = {
    id: string; memberId: string; memberName: string; month: number; year: number; amount: number;
    status: 'paid' | 'pending' | 'overdue' | 'PENDING_VALIDATION' | 'REJECTED';
    paidDate?: string; receiptUri?: string; rejectionReason?: string; adminComment?: string;
};

export type FinanceEntry = {
    id: string; type: 'income' | 'expense'; category: string; description: string; amount: number; date: string;
};

export type EventItem = {
    id: string; title: string; date: string; location: string; emoji: string; month: number;
    description?: string;
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

    addPoll: (p: Omit<Poll, 'id' | 'date' | 'votedBy'>) => void;
    votePoll: (pollId: string, optionId: string, userId: string) => void;
    removePoll: (id: string) => void;

    addFavor: (f: Omit<Favor, 'id' | 'date' | 'createdAt' | 'resolved'>) => void;
    updateFavor: (id: string, updates: Partial<Favor>) => void;
    removeFavor: (id: string) => void;

    addSolicitud: (s: Omit<Solicitud, 'id' | 'date' | 'status' | 'replies' | 'seenByAdmin' | 'seenByUser'>) => void;
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
};

const now = () => new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            announcements: [
                { id: '1', title: 'Reunión mensual de vecinos', body: 'Los invitamos a la reunión mensual este sábado a las 10:00 hrs en la sede vecinal. Se tratarán temas de seguridad y mejoras al barrio.', priority: 'important', date: '28 Feb 2026', replies: [] },
                { id: '2', title: 'Corte de agua programado', body: 'Se informa corte de agua el día lunes de 09:00 a 14:00 hrs por trabajos de mantenimiento en la red de agua potable.', priority: 'normal', date: '27 Feb 2026', replies: [] },
                { id: '3', title: 'Nuevo horario de recolección', body: 'A partir de marzo, la recolección de basura será los días lunes, miércoles y viernes a partir de las 07:00 hrs.', priority: 'normal', date: '25 Feb 2026', replies: [] },
            ],
            solicitudes: [
                { id: '1', title: 'Certificado de Residencia', description: 'Necesito un certificado para presentarlo en la municipalidad', category: 'Certificado', user: 'Javier Aravena Espejo', userEmail: 'javier.aravena25@gmail.com', date: '10 Feb 2026 14:30', status: 'Abierta', hasImage: false, replies: [], seenByAdmin: false, seenByUser: true },
                { id: '2', title: 'Poda de árboles', description: 'Hay unas ramas peligrosas cerca de los cables en mi calle', category: 'Solicitud Municipal', user: 'María González López', userEmail: 'maria.gonzalez@gmail.com', date: '05 Feb 2026 09:15', status: 'Resuelta', hasImage: true, imageUri: 'mock', replies: [{ id: '1r', message: 'Se envió oficio a la municipalidad', from: 'admin', date: '06 Feb 2026' }], seenByAdmin: true, seenByUser: true }
            ],
            documents: [
                { id: '1', title: 'Acta Reunión Febrero 2026', type: 'Acta', date: '15 Feb 2026', emoji: '📋' },
                { id: '2', title: 'Reglamento Interno JJVV', type: 'Reglamento', date: '01 Ene 2026', emoji: '📖' },
                { id: '3', title: 'Balance Financiero 2025', type: 'Finanzas', date: '31 Dic 2025', emoji: '💰' },
            ],
            members: [
                { id: '1', name: 'Javier Aravena Espejo', email: 'javier.aravena25@gmail.com', role: 'Presidente', active: true },
                { id: '2', name: 'María González López', email: 'maria.gonzalez@gmail.com', role: 'Tesorera', active: true },
            ],
            finances: [
                { id: '1', type: 'income', category: 'Cuotas', description: 'Cuotas Enero 2026', amount: 250000, date: '31 Ene 2026' },
                { id: '2', type: 'expense', category: 'Mantenimiento', description: 'Reparación luminarias', amount: 85000, date: '15 Feb 2026' },
                { id: '3', type: 'income', category: 'Cuotas', description: 'Cuotas Febrero 2026', amount: 200000, date: '28 Feb 2026' },
            ],
            memberDues: [
                { id: 'd1', memberId: '1', memberName: 'Javier Aravena Espejo', month: 1, year: 2026, amount: 5000, status: 'paid', paidDate: '15 Ene 2026' },
                { id: 'd2', memberId: '1', memberName: 'Javier Aravena Espejo', month: 2, year: 2026, amount: 5000, status: 'pending' },
                { id: 'd3', memberId: '1', memberName: 'Javier Aravena Espejo', month: 3, year: 2026, amount: 5000, status: 'pending' },
                { id: 'd4', memberId: '1', memberName: 'Javier Aravena Espejo', month: 10, year: 2025, amount: 5000, status: 'overdue' },
                { id: 'd5', memberId: '1', memberName: 'Javier Aravena Espejo', month: 11, year: 2025, amount: 5000, status: 'paid', paidDate: '10 Nov 2025' },
                { id: 'd6', memberId: '1', memberName: 'Javier Aravena Espejo', month: 12, year: 2025, amount: 5000, status: 'paid', paidDate: '12 Dic 2025' },
                { id: 'd7', memberId: '2', memberName: 'María González López', month: 1, year: 2026, amount: 5000, status: 'paid', paidDate: '20 Ene 2026' },
                { id: 'd8', memberId: '2', memberName: 'María González López', month: 2, year: 2026, amount: 5000, status: 'paid', paidDate: '18 Feb 2026' },
                { id: 'd9', memberId: '2', memberName: 'María González López', month: 3, year: 2026, amount: 5000, status: 'pending' },
            ],
            seenAvisosCount: 0,
            seenDocsCount: 3,
            polls: [],
            favors: [],
            events: [
                { id: '1', title: 'Bingo Vecinal', date: '2026-03-01T18:00', location: 'Sede Vecinal', emoji: '🎲', month: 2 },
                { id: '2', title: 'Taller de Primeros Auxilios', date: '2026-03-05T10:00', location: 'Plaza Central', emoji: '🏥', month: 2 },
                { id: '3', title: 'Reunión Ordinaria', date: '2026-03-07T19:00', location: 'Sede Vecinal', emoji: '📋', month: 2 },
                { id: '4', title: 'Feria Vecinal', date: '2026-04-12T10:00', location: 'Pasaje Los Olivos', emoji: '🛍️', month: 3 },
                { id: '5', title: 'Día del Niño', date: '2026-04-20T15:00', location: 'Cancha Multiuso', emoji: '🎈', month: 3 },
                { id: '6', title: 'Asamblea Extraordinaria', date: '2026-05-03T18:30', location: 'Sede Vecinal', emoji: '📢', month: 4 },
            ],
            mapPins: [
                { id: 'pin1', title: 'Sede Vecinal UV 22', description: 'Unidad Vecinal Nº 22, San Miguel', category: 'punto_interes', lat: -33.4920, lng: -70.6610, emoji: '🏛️' },
                { id: 'pin2', title: 'Plaza del Barrio', description: 'Espacio recreativo', category: 'punto_interes', lat: -33.4905, lng: -70.6625, emoji: '🌳' },
                { id: 'pin3', title: 'Consultorio', description: 'Centro de salud cercano', category: 'punto_interes', lat: -33.4940, lng: -70.6590, emoji: '🏥' },
            ],
            orgSettings: { name: 'JJVV UV 22 San Miguel', address: 'Sede Vecinal UV 22, San Miguel', phone: '', social: '' },

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

            addPoll: (p) => set((state) => ({ polls: [{ ...p, id: Date.now().toString(), date: now(), votedBy: [] }, ...state.polls] })),
            votePoll: (pollId, optionId, userId) => set((state) => ({
                polls: state.polls.map(p => {
                    if (p.id !== pollId) return p;
                    const prevVote = p.userVotes?.[userId] || (p.votedBy.includes(userId) ? null : undefined);
                    if (prevVote === optionId) return p; // Same vote, do nothing

                    let newOptions = p.options.map(o => ({ ...o }));
                    if (prevVote) {
                        const prevOptIndex = newOptions.findIndex(o => o.id === prevVote);
                        if (prevOptIndex >= 0) newOptions[prevOptIndex].votes = Math.max(0, newOptions[prevOptIndex].votes - 1);
                    }
                    const newOptIndex = newOptions.findIndex(o => o.id === optionId);
                    if (newOptIndex >= 0) newOptions[newOptIndex].votes++;

                    return {
                        ...p,
                        votedBy: p.votedBy.includes(userId) ? p.votedBy : [...p.votedBy, userId],
                        userVotes: { ...(p.userVotes || {}), [userId]: optionId },
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

            addSolicitud: (s) => set((state) => ({
                solicitudes: [{ ...s, category: s.category || 'Otro', id: Date.now().toString(), date: now(), status: 'Abierta', replies: [], seenByAdmin: false, seenByUser: true }, ...state.solicitudes],
            })),
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

            addDocument: (d) => set((state) => ({
                documents: [{ ...d, id: Date.now().toString(), date: now() }, ...state.documents],
            })),
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

            updateMemberDue: (id, status, paidDate) => set((state) => ({
                memberDues: state.memberDues.map(d => d.id === id ? { ...d, status, paidDate } : d),
            })),
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
        }),
        {
            name: 'jjvv-app-storage-v6',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export const formatCLP = (amount: number) => `$${amount.toLocaleString('es-CL')}`;
