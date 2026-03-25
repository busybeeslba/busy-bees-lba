'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type BrandContextType = {
    primaryColor: string;
    sidebarBg: string;
    logoBase64: string | null;
    logoCollapsedBase64: string | null;
    setPrimaryColor: (color: string) => void;
    setSidebarBg: (color: string) => void;
    setLogoBase64: (base64: string | null) => void;
    setLogoCollapsedBase64: (base64: string | null) => void;
    resetToDefaults: () => void;
};

const DEFAULT_PRIMARY = '#5ce1e6';
const DEFAULT_SIDEBAR = '#5ce1e6';
const DEFAULT_LOGO = '/logo.png'; // Fallback to public asset if no base64 is set

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
    const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
    const [sidebarBg, setSidebarBg] = useState(DEFAULT_SIDEBAR);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [logoCollapsedBase64, setLogoCollapsedBase64] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedPrimary = localStorage.getItem('brand_primaryColor');
        const savedSidebar = localStorage.getItem('brand_sidebarBg');
        const savedLogo = localStorage.getItem('brand_logoBase64');
        const savedLogoCollapsed = localStorage.getItem('brand_logoCollapsedBase64');

        if (savedPrimary) setPrimaryColor(savedPrimary);
        if (savedSidebar) setSidebarBg(savedSidebar);
        if (savedLogo) setLogoBase64(savedLogo);
        if (savedLogoCollapsed) setLogoCollapsedBase64(savedLogoCollapsed);
        
        setIsLoaded(true);
    }, []);

    // Save to localStorage when values change
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem('brand_primaryColor', primaryColor);
        localStorage.setItem('brand_sidebarBg', sidebarBg);
        
        if (logoBase64) {
            localStorage.setItem('brand_logoBase64', logoBase64);
        } else {
            localStorage.removeItem('brand_logoBase64');
        }

        if (logoCollapsedBase64) {
            localStorage.setItem('brand_logoCollapsedBase64', logoCollapsedBase64);
        } else {
            localStorage.removeItem('brand_logoCollapsedBase64');
        }
    }, [primaryColor, sidebarBg, logoBase64, logoCollapsedBase64, isLoaded]);

    const resetToDefaults = () => {
        setPrimaryColor(DEFAULT_PRIMARY);
        setSidebarBg(DEFAULT_SIDEBAR);
        setLogoBase64(null);
        setLogoCollapsedBase64(null);
    };

    return (
        <BrandContext.Provider
            value={{
                primaryColor,
                sidebarBg,
                logoBase64,
                logoCollapsedBase64,
                setPrimaryColor,
                setSidebarBg,
                setLogoBase64,
                setLogoCollapsedBase64,
                resetToDefaults
            }}
        >
            {/* Inject dynamic CSS variables into the DOM globally */}
            <style jsx global>{`
                :root {
                    --primary: ${primaryColor} !important;
                    --sidebar-bg: ${sidebarBg} !important;
                }
            `}</style>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    const context = useContext(BrandContext);
    if (!context) {
        throw new Error('useBrand must be used within a BrandProvider');
    }
    return context;
}
