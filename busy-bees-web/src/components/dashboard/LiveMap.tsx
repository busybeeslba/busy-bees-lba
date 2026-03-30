"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { usePresence, OnlineUser } from '@/context/PresenceContext';

// Dynamically import the Map to avoid SSR errors with window/document
const LiveMapCore = dynamic(() => import('./LiveMapCore'), { 
    ssr: false,
    loading: () => (
        <div style={{ height: '400px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading Live Map...</span>
        </div>
    )
});

export default function LiveMap({ workers }: { workers: any[] }) {
    const { onlineUsers } = usePresence();
    
    return <LiveMapCore onlineUsers={onlineUsers} workers={workers} />;
}
