'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, User, LogOut } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { createClient } from '@/utils/supabase/client';
import { dbClient } from '@/lib/dbClient';
import styles from './Header.module.css';

const PAGE_TITLES: Record<string, string> = {
    '/': 'Live Dashboard',
    '/employees': 'Employee Management',
    '/employees/roles': 'Role Management',
    '/clients': 'Client Management',
    '/services': 'Services',
    '/services/list': 'Service List',
    '/services/client-services': 'Client Services',
    '/forms': 'Forms',
    '/forms/academic-baseline': 'Academic Baseline',
    '/forms/probe': 'Probe',
    '/session-summary': 'Session Summary',
    '/calendar': 'Calendar',
    '/reports': 'Reports',
    '/settings': 'Settings',
};

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { toggleSidebar } = useSidebar();
    const title = PAGE_TITLES[pathname] || 'Busy Bees LBA';

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const allUsers = await dbClient.get('/users');
                    const match = allUsers.find((u: any) => String(u.email).toLowerCase() === String(user.email).toLowerCase());
                    if (match) setCurrentUser(match);
                }
            } catch (err) {
                console.error("Failed to fetch current user:", err);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                <button
                    onClick={toggleSidebar}
                    className={styles.toggleBtn}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} />
                </button>
                <div className={styles.pageTitle} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h1 style={{ marginBottom: pathname === '/' ? '2px' : '0', lineHeight: 1 }}>{title}</h1>
                    {pathname === '/' && (
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, lineHeight: 1, marginTop: '4px' }}>
                            Real-time overview of field operations.
                        </span>
                    )}
                </div>
            </div>
            <div className={styles.userProfile} ref={dropdownRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>
                        {currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Admin User'}
                    </span>
                    <span className={styles.userRole}>
                        {currentUser?.role || 'Administrator'}
                    </span>
                </div>
                <div className={styles.avatar}>
                    {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                        currentUser ? `${currentUser.firstName[0]}${currentUser.lastName?.[0] || ''}` : 'AU'
                    )}
                </div>

                {isDropdownOpen && (
                    <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <button 
                            className={styles.dropdownItem} 
                            onClick={() => {
                                setIsDropdownOpen(false);
                                if (currentUser?.id) router.push(`/users/${currentUser.id}`);
                            }}
                        >
                            <User size={16} /> My Profile
                        </button>
                        <div className={styles.dropdownDivider}></div>
                        <button 
                            className={styles.dropdownItem} 
                            onClick={handleLogout}
                            style={{ color: '#ef4444' }}
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
