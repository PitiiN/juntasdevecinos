import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AccessibilityContextType = {
    fontScale: number;
    highContrast: boolean;
    accessibilityMode: boolean;
    ttsEnabled: boolean;
    setFontScale: (scale: number) => void;
    setHighContrast: (enabled: boolean) => void;
    setAccessibilityMode: (enabled: boolean) => void;
    setTtsEnabled: (enabled: boolean) => void;
    isLoading: boolean;
};

const STORAGE_KEY = 'jjvv-accessibility-prefs';

const AccessibilityContext = createContext<AccessibilityContextType>({
    fontScale: 1.0,
    highContrast: false,
    accessibilityMode: false,
    ttsEnabled: true,
    setFontScale: () => { },
    setHighContrast: () => { },
    setAccessibilityMode: () => { },
    setTtsEnabled: () => { },
    isLoading: true,
});

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
    const [fontScale, setFontScaleState] = useState(1.0);
    const [highContrast, setHighContrastState] = useState(false);
    const [accessibilityMode, setAccessibilityModeState] = useState(false);
    const [ttsEnabled, setTtsEnabledState] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPrefs();
    }, []);

    const loadPrefs = async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                const prefs = JSON.parse(json);
                setFontScaleState(prefs.fontScale ?? 1.0);
                setHighContrastState(prefs.highContrast ?? false);
                setAccessibilityModeState(prefs.accessibilityMode ?? false);
                setTtsEnabledState(prefs.ttsEnabled ?? true);
            }
        } catch { }
        setIsLoading(false);
    };

    const savePrefs = async (prefs: any) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch { }
    };

    const setFontScale = (scale: number) => {
        setFontScaleState(scale);
        savePrefs({ fontScale: scale, highContrast, accessibilityMode, ttsEnabled });
    };

    const setHighContrast = (enabled: boolean) => {
        setHighContrastState(enabled);
        savePrefs({ fontScale, highContrast: enabled, accessibilityMode, ttsEnabled });
    };

    const setAccessibilityMode = (enabled: boolean) => {
        setAccessibilityModeState(enabled);
        savePrefs({ fontScale, highContrast, accessibilityMode: enabled, ttsEnabled });
    };

    const setTtsEnabled = (enabled: boolean) => {
        setTtsEnabledState(enabled);
        savePrefs({ fontScale, highContrast, accessibilityMode, ttsEnabled: enabled });
    };

    return (
        <AccessibilityContext.Provider
            value={{
                fontScale,
                highContrast,
                accessibilityMode,
                ttsEnabled,
                setFontScale,
                setHighContrast,
                setAccessibilityMode,
                setTtsEnabled,
                isLoading
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => useContext(AccessibilityContext);
