'use client';

import { useSidebar } from '@/context/SidebarContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const sidebarWidth = isCollapsed ? '80px' : '260px';

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div
                style={{
                    flex: 1,
                    marginLeft: sidebarWidth,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                    backgroundColor: 'var(--background-light)',
                    transition: 'margin-left 0.3s ease'
                }}
            >
                <Header />
                <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
