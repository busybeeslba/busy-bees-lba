"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OnlineUser, usePresence } from '@/context/PresenceContext';
import { useBrand } from '@/context/BrandContext';

// Fix for default Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for Busy Bees Staff
const createCustomIcon = (name: string, avatarUrl: string | undefined, size: number) => {
    return L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
            <div style="
                background-color: var(--primary);
                width: ${size}px;
                height: ${size}px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            ">
                ${avatarUrl 
                    ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;"/>`
                    : `<span style="font-size:${Math.max(10, Math.floor(size * 0.35))}px; font-weight:bold; color:black;">${name[0]}</span>`
                }
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
    });
};

function MapUpdater({ activeStaff }: { activeStaff: any[] }) {
    const map = useMap();
    const { selectedUserEmail } = usePresence();

    useEffect(() => {
        if (selectedUserEmail) {
            const targetUser = activeStaff.find(s => s.email === selectedUserEmail);
            if (targetUser && targetUser.location) {
                // Fly rapidly to the user's location with a closer zoom
                map.flyTo([targetUser.location.latitude, targetUser.location.longitude], 16, {
                    duration: 1.5,
                });
            }
        }
    }, [selectedUserEmail, activeStaff, map]);

    // Force Leaflet to recalculate its container bounds after the Next.js UI physically mounts
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 150);
        const t2 = setTimeout(() => map.invalidateSize(), 500);
        const t3 = setTimeout(() => map.invalidateSize(), 1500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        }
    }, [map]);

    return null;
}

interface LiveMapCoreProps {
    onlineUsers: OnlineUser[];
    workers: any[];
}

import { createClient } from '@/utils/supabase/client';

export default function LiveMapCore({ onlineUsers, workers: initialWorkers }: LiveMapCoreProps) {
    const { staffAvatarSize } = useBrand();
    const [workers, setWorkers] = React.useState(initialWorkers);

    React.useEffect(() => { setWorkers(initialWorkers); }, [initialWorkers]);

    React.useEffect(() => {
        const supabase = createClient();
        const chan = supabase.channel('online_map_db_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                setWorkers(prev => prev.map(w => String(w.email).toLowerCase() === String(payload.new.email).toLowerCase() ? { ...w, ...payload.new } : w));
            })
            .subscribe();
        return () => { supabase.removeChannel(chan); };
    }, []);

    // Determine the center of the map based on online users, fallback to default NYC
    const defaultCenter: [number, number] = [40.7128, -74.0060];
    
    // 1. First gather active structural data from the Postgres DB heartbeat tracker
    const dbActiveStaff = workers.filter(w => w.lastEditAt && w.location && (new Date().getTime() - new Date(w.lastEditAt).getTime() < 180000));
    const activeStaffMap = new Map();

    dbActiveStaff.forEach(w => {
        let parsedLocation = null;
        try { parsedLocation = typeof w.location === 'string' ? JSON.parse(w.location) : w.location; } catch(e) {}
        if (parsedLocation && parsedLocation.latitude) {
            activeStaffMap.set(String(w.email).toLowerCase(), {
                email: String(w.email).toLowerCase(),
                location: parsedLocation,
                deviceType: 'mobile',
                workerName: `${w.firstName} ${w.lastName}`,
                avatar: w.avatar
            });
        }
    });

    // 2. Overwrite with Real-Time WebSocket streams (which are 10x faster when app is physically open)
    onlineUsers.forEach(u => {
        if (u.location) {
            const worker = workers.find(w => String(w.email).toLowerCase() === u.email);
            activeStaffMap.set(u.email, {
                ...u,
                workerName: worker ? `${worker.firstName} ${worker.lastName}` : u.email,
                avatar: worker?.avatar
            });
        }
    });

    // 3. Convert Map back to array for rendering
    const activeStaff = Array.from(activeStaffMap.values());

    const center = activeStaff.length > 0 
        ? [activeStaff[0].location!.latitude, activeStaff[0].location!.longitude] as [number, number]
        : defaultCenter;

    return (
        <MapContainer 
            center={center} 
            zoom={12} 
            style={{ height: '100%', width: '100%', minHeight: '400px', backgroundColor: '#e5e7eb' }}
        >
            <MapUpdater activeStaff={activeStaff} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {activeStaff.map((staff, idx) => (
                <Marker 
                    key={idx} 
                    position={[staff.location!.latitude, staff.location!.longitude]}
                    icon={createCustomIcon(staff.workerName, staff.avatar, staffAvatarSize)}
                >
                    <Popup>
                        <strong>{staff.workerName}</strong><br/>
                        Online • GPS Active
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
