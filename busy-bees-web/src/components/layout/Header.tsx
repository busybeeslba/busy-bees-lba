'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import styles from './Header.module.css';

const PAGE_TITLES: Record<string, string> = {
    '/': 'Dashboard',
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
    const { toggleSidebar } = useSidebar();
    const title = PAGE_TITLES[pathname] || 'Busy Bees LBA';

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
                <div className={styles.pageTitle}>
                    <h1>{title}</h1>
                </div>
            </div>
            <div className={styles.userProfile}>
                <div className={styles.userInfo}>
                    <span className={styles.userName}>Admin User</span>
                    <span className={styles.userRole}>Administrator</span>
                </div>
                <div className={styles.avatar}>
                    AU
                </div>
            </div>
        </header>
    );
}
