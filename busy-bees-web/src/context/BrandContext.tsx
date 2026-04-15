'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbClient } from '@/lib/dbClient';

type BrandContextType = {
    primaryColor: string;
    secondaryColor: string;
    sidebarBg: string;
    logoBase64: string | null;
    logoCollapsedBase64: string | null;
    logoZoom: number;
    logoCollapsedZoom: number;
    setPrimaryColor: (color: string) => void;
    setSecondaryColor: (color: string) => void;
    setSidebarBg: (color: string) => void;
    setLogoBase64: (base64: string | null) => void;
    setLogoCollapsedBase64: (base64: string | null) => void;
    setLogoZoom: (zoom: number) => void;
    setLogoCollapsedZoom: (zoom: number) => void;
    staffAvatarSize: number;
    setStaffAvatarSize: (size: number) => void;
    resetToDefaults: () => void;
};

const DEFAULT_PRIMARY = '#5ce1e6';
const DEFAULT_SECONDARY = '#fef08a';
const DEFAULT_SIDEBAR = '#5ce1e6';
const DEFAULT_LOGO = '/logo.png'; // Fallback to public asset if no base64 is set

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
    const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
    const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
    const [sidebarBg, setSidebarBg] = useState(DEFAULT_SIDEBAR);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [logoCollapsedBase64, setLogoCollapsedBase64] = useState<string | null>(null);
    const [logoZoom, setLogoZoom] = useState<number>(100);
    const [logoCollapsedZoom, setLogoCollapsedZoom] = useState<number>(100);
    const [staffAvatarSize, setStaffAvatarSize] = useState<number>(36);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage and then DB on mount
    useEffect(() => {
        // Fast local load
        const savedPrimary = localStorage.getItem('brand_primaryColor');
        const savedSecondary = localStorage.getItem('brand_secondaryColor');
        const savedSidebar = localStorage.getItem('brand_sidebarBg');
        const savedLogo = localStorage.getItem('brand_logoBase64');
        const savedLogoCollapsed = localStorage.getItem('brand_logoCollapsedBase64');
        const savedZoom = localStorage.getItem('brand_logoZoom');
        const savedZoomC = localStorage.getItem('brand_logoCollapsedZoom');
        const savedAvatarSize = localStorage.getItem('brand_staffAvatarSize');

        if (savedPrimary) setPrimaryColor(savedPrimary);
        if (savedSecondary) setSecondaryColor(savedSecondary);
        if (savedSidebar) setSidebarBg(savedSidebar);
        if (savedLogo) setLogoBase64(savedLogo);
        if (savedLogoCollapsed) setLogoCollapsedBase64(savedLogoCollapsed);
        if (savedZoom) setLogoZoom(parseInt(savedZoom, 10));
        if (savedZoomC) setLogoCollapsedZoom(parseInt(savedZoomC, 10));
        if (savedAvatarSize) setStaffAvatarSize(parseInt(savedAvatarSize, 10));
        
        setIsLoaded(true);

        // Slow DB override (globally synchronizes updates from other PCs)
        dbClient.get('/system_settings/global')
            .then(data => {
                if (!data) return;
                
                if (data.primaryColor) setPrimaryColor(data.primaryColor);
                if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
                if (data.sidebarBg) setSidebarBg(data.sidebarBg);
                if (data.logoZoom) setLogoZoom(data.logoZoom);
                if (data.logoCollapsedZoom) setLogoCollapsedZoom(data.logoCollapsedZoom);
                if (data.staffAvatarSize) setStaffAvatarSize(data.staffAvatarSize);
                if (data.logoBase64) setLogoBase64(data.logoBase64);
                if (data.logoCollapsedBase64) setLogoCollapsedBase64(data.logoCollapsedBase64);

                // Re-cache fresh DB data to local storage for next boot speedup
                if (data.primaryColor) localStorage.setItem('brand_primaryColor', data.primaryColor);
                if (data.secondaryColor) localStorage.setItem('brand_secondaryColor', data.secondaryColor);
                if (data.sidebarBg) localStorage.setItem('brand_sidebarBg', data.sidebarBg);
                if (data.logoZoom) localStorage.setItem('brand_logoZoom', data.logoZoom.toString());
                if (data.logoCollapsedZoom) localStorage.setItem('brand_logoCollapsedZoom', data.logoCollapsedZoom.toString());
                if (data.staffAvatarSize) localStorage.setItem('brand_staffAvatarSize', data.staffAvatarSize.toString());
                try {
                    if (data.logoBase64) localStorage.setItem('brand_logoBase64', data.logoBase64);
                    if (data.logoCollapsedBase64) localStorage.setItem('brand_logoCollapsedBase64', data.logoCollapsedBase64);
                } catch(e) {}
            })
            .catch(err => {
                console.log('No global system setting found yet in Supabase (or shared DB is offline). Relying on default cache.');
            });

    }, []);

    // Save to localStorage AND Supabase when values change
    useEffect(() => {
        if (!isLoaded) return;

        localStorage.setItem('brand_primaryColor', primaryColor);
        localStorage.setItem('brand_secondaryColor', secondaryColor);
        localStorage.setItem('brand_sidebarBg', sidebarBg);
        localStorage.setItem('brand_logoZoom', logoZoom.toString());
        localStorage.setItem('brand_logoCollapsedZoom', logoCollapsedZoom.toString());
        localStorage.setItem('brand_staffAvatarSize', staffAvatarSize.toString());

        try {
            if (logoBase64) localStorage.setItem('brand_logoBase64', logoBase64);
            else localStorage.removeItem('brand_logoBase64');

            if (logoCollapsedBase64) localStorage.setItem('brand_logoCollapsedBase64', logoCollapsedBase64);
            else localStorage.removeItem('brand_logoCollapsedBase64');
        } catch (e) {
            console.error('LocalStorage quota exceeded saving logo:', e);
            alert('Your logo image is too large properties to save to local storage. Try uploading a smaller size image.');
        }

        // Push global update to Database
        const payload = {
            id: 'global',
            primaryColor,
            secondaryColor,
            sidebarBg,
            logoZoom,
            logoCollapsedZoom,
            staffAvatarSize,
            logoBase64,
            logoCollapsedBase64
        };
        // Debounce / send quietly in background
        const timeout = setTimeout(() => {
            dbClient.patch('/system_settings/global', payload).catch(err => {
                // Ignore silent update errors if table not created
                // console.warn('Could not sync brand to database. Run SQL migration.');
            });
        }, 1000);

        return () => clearTimeout(timeout);

    }, [primaryColor, secondaryColor, sidebarBg, logoBase64, logoCollapsedBase64, logoZoom, logoCollapsedZoom, staffAvatarSize, isLoaded]);

    const resetToDefaults = () => {
        setPrimaryColor(DEFAULT_PRIMARY);
        setSecondaryColor(DEFAULT_SECONDARY);
        setSidebarBg(DEFAULT_SIDEBAR);
        setLogoBase64(null);
        setLogoCollapsedBase64(null);
        setLogoZoom(100);
        setLogoCollapsedZoom(100);
        setStaffAvatarSize(36);
    };

    return (
        <BrandContext.Provider
            value={{
                primaryColor,
                secondaryColor,
                sidebarBg,
                logoBase64,
                logoCollapsedBase64,
                logoZoom,
                logoCollapsedZoom,
                setPrimaryColor,
                setSecondaryColor,
                setSidebarBg,
                setLogoBase64,
                setLogoCollapsedBase64,
                setLogoZoom,
                setLogoCollapsedZoom,
                staffAvatarSize,
                setStaffAvatarSize,
                resetToDefaults
            }}
        >
            {/* Inject dynamic CSS variables into the DOM globally */}
            <style jsx global>{`
                :root {
                    --primary: ${primaryColor} !important;
                    --secondary: ${secondaryColor} !important;
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
