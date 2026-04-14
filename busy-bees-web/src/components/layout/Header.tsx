'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, User, LogOut, Bell } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { createClient } from '@/utils/supabase/client';
import { dbClient } from '@/lib/dbClient';
import styles from './Header.module.css';
import notifStyles from './HeaderNotifications.module.css';

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
    
    const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const allUsers = await dbClient.get('/users');
                    const match = allUsers.find((u: any) => String(u.email).toLowerCase() === String(user.email).toLowerCase());
                    if (match) {
                        setCurrentUser(match);
                        
                        // 1. Initial Fetch of Unread Messages
                        const { data: myParticipations } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', match.id);
                        if (myParticipations && myParticipations.length > 0) {
                             const roomIds = myParticipations.map((p:any) => p.conversation_id);
                             const { data: unreads } = await supabase.from('chat_messages')
                                .select('*, users!chat_messages_sender_id_fkey(firstName, lastName)')
                                .in('conversation_id', roomIds)
                                .neq('sender_id', match.id)
                                .neq('status', 'read')
                                .order('created_at', { ascending: false });
                                
                             if (unreads) setUnreadMessages(unreads);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch current user:", err);
            }
        };
        fetchUser();
        
        // 2. Realtime Global Unread Listener
        const supabase = createClient();
        const channel = supabase.channel('global-notifs')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
             const dbMsg = payload.new as any;
             
             // Cross-Component Synthetic Dispatch: Guarantee ChatDashboard ALWAYS gets the payload even if Supabase Realtime multiplexer starves its distinct channel.
             if (typeof window !== 'undefined') {
                 window.dispatchEvent(new CustomEvent('new_chat_message', { detail: dbMsg }));
             }
             
             // NOTIFICATION SUPPRESSION
             // If the user happens to have this exact chat currently open in the ChatDashboard, silently swallow the ping!
             const activeChatId = sessionStorage.getItem('activeChatId');
             if (window.location.pathname.includes('/chat') && activeChatId === dbMsg.conversation_id) {
                 return; 
             }
             
             // AUTO-HEALING DIVERGENT LINKAGES
             // If User B deleted their localized participation, but User A still sends a message here, force User B's link back alive!
             const loggedUser = (await supabase.auth.getUser()).data?.user;
             if (loggedUser) {
                 const { data: allUsers } = await supabase.from('users').select('id, email');
                 const match = allUsers?.find(u => String(u.email).toLowerCase() === String(loggedUser.email).toLowerCase());
                 if (match && dbMsg.sender_id !== match.id) {
                     // Auto-Healing migration: ChatDashboard handles natively synchronous room re-attachment to completely eliminate fetch/insert race conditions.
                     // However, if the user receives this ping globally while ON A DIFFERENT PAGE (e.g. /dashboard), Header must handle the healing here so that when they click the notification, the ChatRoom is natively prepared!
                     if (!window.location.pathname.includes('/chat')) {
                         const { data: isParticipant } = await supabase.from('chat_participants').select('conversation_id').eq('conversation_id', dbMsg.conversation_id).eq('user_id', match.id);
                         if (!isParticipant || isParticipant.length === 0) {
                              await supabase.from('chat_participants').insert({ conversation_id: dbMsg.conversation_id, user_id: match.id });
                         }
                     }
                 }
             }


             fetchUser(); // Re-fetch unread count safely
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
             fetchUser(); // Re-fetch unread count if things get marked read
             window.dispatchEvent(new CustomEvent('update_chat_message', { detail: payload.new }));
          })
          .subscribe();

        return () => {
           supabase.removeChannel(channel);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifs(false);
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
            <div className={notifStyles.rightSection}>
                {/* NOTIFICATION BELL */}
                <div className={notifStyles.bellContainer} ref={notifRef} onClick={() => setShowNotifs(!showNotifs)}>
                    <Bell size={20} />
                    {unreadMessages.length > 0 && (
                        <div className={notifStyles.badge}>{unreadMessages.length}</div>
                    )}
                    
                    {showNotifs && (
                        <div className={notifStyles.notifDropdown} onClick={(e) => e.stopPropagation()}>
                            <div className={notifStyles.notifHeader}>Recent Unread Messages</div>
                            {unreadMessages.length > 0 ? (
                                unreadMessages.map(msg => (
                                    <div 
                                        key={msg.id} 
                                        className={notifStyles.notifItem}
                                        onClick={() => {
                                            setShowNotifs(false);
                                            router.push(`/chat?roomId=${msg.conversation_id}`);
                                        }}
                                    >
                                        <div className={notifStyles.notifName}>{msg.users?.firstName} {msg.users?.lastName}</div>
                                        <div className={notifStyles.notifText}>{msg.content || 'Sent an attachment'}</div>
                                    </div>
                                ))
                            ) : (
                                <div className={notifStyles.emptyNotifs}>No new messages</div>
                            )}
                        </div>
                    )}
                </div>

                {/* USER PROFILE */}
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
            </div>
        </header>
    );
}
