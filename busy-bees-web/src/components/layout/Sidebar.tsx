'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Users, Calendar, FileText, Settings, LogOut, Building2, Wrench, ClipboardCheck, ChevronDown, ChevronRight, Palette } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useBrand } from '@/context/BrandContext';
import { createClient } from '@/utils/supabase/client';
import styles from './Sidebar.module.css';

const MENU_ITEMS = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    {
        name: 'Employees',
        icon: Users,
        path: '/employees',
        subItems: [
            { name: 'Staff List', path: '/employees' },
            { name: 'Role Management', path: '/employees/roles' },
        ],
    },

    { name: 'Clients', icon: Building2, path: '/clients' },
    {
        name: 'Services',
        icon: Wrench,
        path: '/services',
        subItems: [
            { name: 'Service List', path: '/services/list' },
            { name: 'Client Services', path: '/services/client-services' },
        ],
    },
    {
        name: 'Forms', icon: ClipboardCheck, path: '/forms',
        subItems: [
            { name: 'Baseline Sheet', path: '/forms/baseline-sheet' },
            { name: 'Baseline Data Table', path: '/forms/baseline-sheet/data-table' },
            { name: 'Mass Trial / DTT', path: '/forms/mass-trial' },
            { name: 'DTT Data Table', path: '/forms/mass-trial/data-table' },
            { name: 'Daily Routines', path: '/forms/daily-routines' },
            { name: 'Daily Routines Data Table', path: '/forms/daily-routines/data-table' },
            { name: 'Transaction Sheet', path: '/forms/transaction-sheet' },
            { name: 'Transaction Data Table', path: '/forms/transaction-sheet/data-table' },
        ],
    },
    { name: 'Session Summary', icon: FileText, path: '/session-summary' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
    { name: 'Reports', icon: FileText, path: '/reports' },
    { 
        name: 'Settings', 
        icon: Settings, 
        path: '/settings',
        subItems: [
            { name: 'Brand', path: '/settings/brand' }
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed } = useSidebar();
    const { logoBase64, logoCollapsedBase64, logoZoom, logoCollapsedZoom } = useBrand();
    const supabase = createClient();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        '/employees': pathname.startsWith('/employees'),
        '/services': pathname.startsWith('/services'),
        '/forms': pathname.startsWith('/forms'),
        '/settings': pathname.startsWith('/settings')
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const toggleMenu = (path: string) => {
        setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.logo}>
                {!isCollapsed ? (
                    <img 
                        src={logoBase64 || "/logo.png"} 
                        alt="Busy Bees LBA" 
                        className={styles.logoImage} 
                        style={{ transform: `scale(${logoZoom / 100})` }}
                    />
                ) : (
                    <img 
                        src={logoCollapsedBase64 || "/logo_small.png"} 
                        alt="Icon" 
                        className={styles.logoImage} 
                        style={{ transform: `scale(${logoCollapsedZoom / 100})` }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerText = '🐝';
                            (e.target as HTMLImageElement).parentElement!.style.fontSize = '24px';
                        }}
                    />
                )}
            </div>

            <nav className={styles.nav}>
                {MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.subItems
                        ? pathname.startsWith(item.path)
                        : pathname === item.path;

                    if (item.subItems) {
                        const isOpen = openMenus[item.path];
                        return (
                            <div key={item.path} className={styles.navGroup}>
                                <button
                                    className={`${styles.navItem} ${isActive && !isOpen ? styles.active : ''}`}
                                    onClick={() => toggleMenu(item.path)}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <Icon size={20} />
                                    {!isCollapsed && (
                                        <>
                                            <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
                                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </>
                                    )}
                                </button>
                                {!isCollapsed && isOpen && (
                                    <div className={styles.subMenu}>
                                        {item.subItems.map((subItem) => (
                                            <Link
                                                key={subItem.path}
                                                href={subItem.path}
                                                className={`${styles.subMenuItem} ${pathname === subItem.path ? styles.activeSubMenu : ''}`}
                                            >
                                                {subItem.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={isCollapsed ? item.name : ''}
                        >
                            <Icon size={20} />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <button className={styles.logoutBtn} onClick={handleLogout} title={isCollapsed ? 'Logout' : ''}>
                    <LogOut size={18} />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
