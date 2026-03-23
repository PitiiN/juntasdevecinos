import { supabase } from '../lib/supabase';

const asNumber = (value: any): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const buildPoiPayloadVariants = (poiData: any) => {
    const lat = asNumber(poiData?.latitude ?? poiData?.lat ?? poiData?.location?.latitude ?? poiData?.location?.lat);
    const lng = asNumber(poiData?.longitude ?? poiData?.lng ?? poiData?.location?.longitude ?? poiData?.location?.lng);
    const hasCoordinates = lat !== null && lng !== null;
    const locationPayload = hasCoordinates ? { latitude: lat, longitude: lng, lat, lng } : undefined;

    const withLocationAndCoords = hasCoordinates
        ? { ...poiData, latitude: lat, longitude: lng, location: locationPayload }
        : { ...poiData };
    const withLocationOnly = hasCoordinates
        ? (({ latitude, longitude, lat, lng, ...rest }: any) => ({ ...rest, location: locationPayload }))(poiData)
        : null;
    const withCoordsOnly = hasCoordinates
        ? (({ location, ...rest }: any) => ({ ...rest, latitude: lat, longitude: lng }))(poiData)
        : null;

    const variants = [withLocationAndCoords, withLocationOnly, withCoordsOnly, { ...poiData }].filter(Boolean);
    const seen = new Set<string>();
    return variants.filter((variant) => {
        const key = JSON.stringify(variant);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const shouldTryNextVariant = (error: any) => {
    const message = (error?.message || '').toString().toLowerCase();
    return (
        message.includes('does not exist') ||
        message.includes('schema cache') ||
        message.includes('null value in column "location"') ||
        message.includes('null value in column location')
    );
};

export const poiService = {
    // Get POIs for an organization
    async getPois(organizationId: string) {
        const { data, error } = await supabase
            .from('pois')
            .select('*')
            .eq('organization_id', organizationId)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Create POI (Admin)
    async createPoi(poiData: any) {
        const payloadVariants = buildPoiPayloadVariants(poiData);
        let lastError: any = null;

        for (const payload of payloadVariants) {
            const { data, error } = await supabase
                .from('pois')
                .insert(payload)
                .select()
                .single();

            if (!error) {
                return data;
            }

            lastError = error;
            if (!shouldTryNextVariant(error)) {
                throw error;
            }
        }

        throw lastError;
    },

    // Update POI (Admin)
    async updatePoi(id: string, poiData: any) {
        const payloadVariants = buildPoiPayloadVariants(poiData);
        let lastError: any = null;

        for (const payload of payloadVariants) {
            const { error } = await supabase
                .from('pois')
                .update(payload)
                .eq('id', id);

            if (!error) {
                return;
            }

            lastError = error;
            if (!shouldTryNextVariant(error)) {
                throw error;
            }
        }

        throw lastError;
    },

    // Delete POI (Admin)
    async deletePoi(id: string) {
        const { error } = await supabase
            .from('pois')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
