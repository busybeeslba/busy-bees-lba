'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, MoreHorizontal, Phone, Mail, MapPin, Globe, Monitor, Filter, ArrowUpDown, X, Save, Camera } from 'lucide-react';
import type { CSSProperties } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { useRouter } from 'next/navigation';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

const formatPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return val;
    return !match[2] ? match[1] : `${match[1]}-${match[2]}` + (match[3] ? `-${match[3]}` : '');
};

const capitalizeName = (str: string) => {
    if (!str) return str;
    return str.replace(/\b\w/g, c => c.toUpperCase());
};

export default function UsersPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    
    // Edit Modal State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [formData, setFormData] = useState<any>(null);

    // Telemetry state for real data insertion
    const [realTelemetry, setRealTelemetry] = useState({ 
        ip: 'Pending...', 
        location: 'Pending...',
        browser: 'Unknown'
    });

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({
        firstName: '', lastName: '', phone: '', email: '', 
        address: '', location: '', status: 'Active', role: 'Trainee',
        avatar: ''
    });

    const handleAvatarFile = (file: File | undefined, setter: Function) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setter((prev: any) => ({ ...prev, avatar: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Fetch real IP and general GPS coord data for the user on initial load
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                if (data && data.ip) {
                    let envBrowser = 'Unknown';
                    const ua = window.navigator.userAgent;
                    if (ua.includes('Chrome')) envBrowser = 'Chrome';
                    else if (ua.includes('Firefox')) envBrowser = 'Firefox';
                    else if (ua.includes('Safari')) envBrowser = 'Safari';
                    else if (ua.includes('Edge')) envBrowser = 'Edge';

                    setRealTelemetry(prev => ({
                        ...prev,
                        ip: data.ip,
                        location: prev.location === 'Pending...' ? `${data.latitude}, ${data.longitude}` : prev.location,
                        browser: envBrowser
                    }));
                }
            })
            .catch(() => console.error('Failed to grab real telemetry'));

        // Request high-accuracy GPS coordinates from the device hardware
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setRealTelemetry(prev => ({
                        ...prev,
                        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    }));
                },
                (error) => console.warn('Geolocation denied or failed, using IP fallback.', error),
                { enableHighAccuracy: true }
            );
        }

        const fetchUsers = async () => {
            const { data, error } = await supabase.from('users').select('*').order('createdAt', { ascending: false });
            if (!error && data) {
                // Ensure dates format nicely
                const formatted = data.map(u => ({
                    ...u,
                    createdAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
                    updatedAt: u.lastEditAt ? new Date(u.lastEditAt).toISOString().split('T')[0] : ''
                }));
                setUsers(formatted);
            }
            setIsMounted(true);
        };
        fetchUsers();
    }, []);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredByRules = useDataFilter({ data: users, rules: filterRules, matchType });

    const sortedUsers = useMemo(() => {
        let sortableItems = filteredByRules.filter((user: any) =>
            Object.values(user).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sortConfig !== null) {
            sortableItems.sort((a: any, b: any) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [sortConfig, filteredByRules, searchQuery]);

    if (!isMounted) return null;

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} />
                        <span>Add New User</span>
                    </button>

                    {/* Filter Drawer Toggle */}
                    <button className={styles.filterBtn} onClick={() => setShowFilterDrawer(true)}>
                        <Filter size={16} color="currentColor" />
                        <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                    </button>
                </div>
            </div>

            {/* Filter Drawer Panel */}
            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="users_list"
                columns={[
                    { id: 'employeeId', label: 'Employee ID' },
                    { id: 'firstName', label: 'First Name' },
                    { id: 'lastName', label: 'Last Name' },
                    { id: 'email', label: 'Email' },
                    { id: 'role', label: 'Role' },
                    { id: 'status', label: 'Status' },
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, type) => {
                    setFilterRules(rules);
                    setMatchType(type);
                    setShowFilterDrawer(false);
                }}
            />

            {/* Staff Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('employeeId')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Employee ID
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'employeeId' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('firstName')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    First Name
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'firstName' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('lastName')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Last Name
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'lastName' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('phone')} style={{ minWidth: '120px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Phone
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'phone' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('email')} style={{ minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Email
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'email' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('address')} style={{ minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Address
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'address' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('role')} style={{ minWidth: '120px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Role
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'role' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('location')} style={{ minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Current Location
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'location' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('externalIp')} style={{ minWidth: '120px', cursor: 'pointer', userSelect: 'none' }} title="IP address usually logged in from">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Usual Login IP
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'externalIp' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('browser')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Browser
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'browser' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('status')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Status
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'status' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('createdAt')} style={{ minWidth: '140px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Created At
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'createdAt' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('createdBy')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Created By
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'createdBy' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('updatedAt')} style={{ minWidth: '140px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Last Edit At
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'updatedAt' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('updatedBy')} style={{ minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Last Edit By
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'updatedBy' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th style={{ minWidth: '120px', position: 'sticky', right: 0, backgroundColor: '#f9fafb' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user: any) => (
                            <tr 
                                key={user.id} 
                                onClick={() => router.push(`/users/${user.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td><span style={{ fontWeight: 600 }}>{user.employeeId}</span></td>
                                <td>{user.firstName}</td>
                                <td>{user.lastName}</td>
                                <td>{user.phone}</td>
                                <td>{user.email}</td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{user.address}</span></td>
                                <td><span style={{ padding: '4px 8px', backgroundColor: 'var(--background-light)', borderRadius: '4px', fontSize: '12px' }}>{user.role}</span></td>
                                <td>
                                    <div className={styles.locationCell}>
                                        {user.location ? (
                                            <a href={`https://www.google.com/maps?q=${encodeURIComponent(user.location)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                                <MapPin size={14} color="var(--primary)" style={{ cursor: 'pointer' }} />
                                                <span className="hover-underline">{user.location}</span>
                                            </a>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary-light)' }}>Unknown</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary-light)' }}>
                                        <Globe size={12} />
                                        {user.externalIp}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary-light)' }}>
                                        <Monitor size={12} />
                                        {user.browser?.split(' ')[0] || 'Unknown'}
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${user.status === 'Active' ? styles.active : styles.offline}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{user.createdAt}</span></td>
                                <td><span style={{ fontSize: '12px' }}>{user.createdBy}</span></td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{user.updatedAt}</span></td>
                                <td><span style={{ fontSize: '12px' }}>{user.updatedBy}</span></td>
                                <td style={{ position: 'sticky', right: 0, backgroundColor: 'white', borderLeft: '1px solid var(--border-light)', zIndex: activeDropdown === user.id ? 20 : 1 }} onClick={(e) => e.stopPropagation()}>
                                    <div className={styles.contactIcons}>
                                        <button title="Call" onClick={() => window.open(`tel:${user.phone}`)}>
                                            <Phone size={16} />
                                        </button>
                                        <button title="Email" onClick={() => window.open(`mailto:${user.email}`)}>
                                            <Mail size={16} />
                                        </button>
                                        <div style={{ position: 'relative' }}>
                                            <button 
                                                title="More Options" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === user.id ? null : user.id);
                                                }}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>

                                            {activeDropdown === user.id && (
                                                <div 
                                                    style={{ position: 'absolute', right: '100%', top: 0, backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '160px', padding: '4px 0', marginRight: '8px', display: 'flex', flexDirection: 'column', outline: 'none' }} 
                                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                                                >
                                                    <button 
                                                        style={{ padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', width: '100%' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdown(null);
                                                            setEditingUser(user);
                                                            setFormData({
                                                                firstName: user.firstName,
                                                                lastName: user.lastName,
                                                                phone: user.phone,
                                                                email: user.email,
                                                                address: user.address,
                                                                location: user.location,
                                                                status: user.status,
                                                                avatar: user.avatar || ''
                                                            });
                                                        }}
                                                    >
                                                        Edit User
                                                    </button>
                                                    <button 
                                                        style={{ padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', width: '100%' }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
                                                            const updated = { ...user, status: newStatus };
                                                            setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
                                                            await supabase.from('users').update({ status: newStatus, lastEditAt: new Date().toISOString() }).eq('id', user.id);
                                                        }}
                                                    >
                                                        {user.status === 'Active' ? 'Disable User' : 'Enable User'}
                                                    </button>
                                                    <div style={{ height: '1px', backgroundColor: 'var(--border-light)', margin: '4px 0' }}></div>
                                                    <button 
                                                        style={{ padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)', width: '100%' }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
                                                                setUsers(prev => prev.filter(u => u.id !== user.id));
                                                                await supabase.from('users').delete().eq('id', user.id);
                                                            }
                                                        }}
                                                    >
                                                        Delete User
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '16px 24px', color: 'var(--text-secondary-light)', fontSize: '13px', borderTop: '1px solid var(--border-light)', backgroundColor: '#f9fafb', fontWeight: 500 }}>
                    Showing {sortedUsers.length} users
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && formData && (
                <div style={modalOverlayStyle} onClick={(e) => { e.stopPropagation(); setEditingUser(null); }}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Edit User</h2>
                            <button onClick={() => setEditingUser(null)} style={closeBtnStyle}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #ffc107 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: '#000', overflow: 'hidden' }}>
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        (formData.firstName[0] || 'U') + (formData.lastName[0] || '')
                                    )}
                                </div>
                                <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1px solid var(--border-light)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <Camera size={16} color="var(--text-main)" />
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarFile(e.target.files?.[0], setFormData)} />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>First Name</label>
                                <input style={inputStyle} value={formData.firstName} onChange={e => setFormData({...formData, firstName: capitalizeName(e.target.value)})} />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name</label>
                                <input style={inputStyle} value={formData.lastName} onChange={e => setFormData({...formData, lastName: capitalizeName(e.target.value)})} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Phone Number</label>
                                <input style={inputStyle} value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input style={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Home Address</label>
                            <Autocomplete
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                                onPlaceSelected={(place: any) => {
                                    setFormData({...formData, address: place.formatted_address || ''});
                                }}
                                style={inputStyle}
                                defaultValue={formData.address}
                                options={{ types: ['address'] }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Status</label>
                                <select style={inputStyle} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="Active">Active</option>
                                    <option value="Offline">Offline</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Current Location</label>
                                <input style={inputStyle} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setEditingUser(null)} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={async () => {
                                const payload = { ...formData, lastEditAt: new Date().toISOString(), lastEditBy: 'Admin' };
                                const updated = { ...editingUser, ...payload };
                                setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
                                setEditingUser(null);
                                await supabase.from('users').update(payload).eq('id', editingUser.id);
                            }} style={saveBtnStyle}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div style={modalOverlayStyle} onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(false); }}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Add New User</h2>
                            <button onClick={() => setIsAddModalOpen(false)} style={closeBtnStyle}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #ffc107 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: '#000', overflow: 'hidden' }}>
                                    {addFormData.avatar ? (
                                        <img src={addFormData.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        (addFormData.firstName[0] || 'U') + (addFormData.lastName[0] || '')
                                    )}
                                </div>
                                <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1px solid var(--border-light)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <Camera size={16} color="var(--text-main)" />
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarFile(e.target.files?.[0], setAddFormData)} />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>First Name</label>
                                <input style={inputStyle} value={addFormData.firstName} placeholder="Jane" onChange={e => setAddFormData({...addFormData, firstName: capitalizeName(e.target.value)})} />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name</label>
                                <input style={inputStyle} value={addFormData.lastName} placeholder="Doe" onChange={e => setAddFormData({...addFormData, lastName: capitalizeName(e.target.value)})} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Phone Number</label>
                                <input style={inputStyle} value={addFormData.phone} placeholder="555-019-9000" onChange={e => setAddFormData({...addFormData, phone: formatPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input style={inputStyle} value={addFormData.email} placeholder="jane@busybees.com" onChange={e => setAddFormData({...addFormData, email: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Role</label>
                                <select style={inputStyle} value={addFormData.role} onChange={e => setAddFormData({...addFormData, role: e.target.value})}>
                                    <option value="Admin">Admin</option>
                                    <option value="Supervisor">Supervisor</option>
                                    <option value="Senior Technician">Senior Technician</option>
                                    <option value="Field Specialist">Field Specialist</option>
                                    <option value="Trainee">Trainee</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Captured Device Telemetry</label>
                                <div style={{...inputStyle, backgroundColor: 'var(--background-light)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px', height: 'auto', padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                        <MapPin size={12} color="var(--primary)" />
                                        <span style={{ fontWeight: 600 }}>GPS:</span> <span style={{ color: 'var(--text-secondary)' }}>{realTelemetry.location}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                        <Globe size={12} color="var(--primary)" />
                                        <span style={{ fontWeight: 600 }}>IP:</span> <span style={{ color: 'var(--text-secondary)' }}>{realTelemetry.ip}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Home Address</label>
                            <Autocomplete
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                                onPlaceSelected={(place: any) => {
                                    setAddFormData({...addFormData, address: place.formatted_address || ''});
                                }}
                                style={inputStyle}
                                defaultValue={addFormData.address}
                                options={{ types: ['address'] }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setIsAddModalOpen(false)} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={async () => {
                                const newUser = {
                                    employeeId: 'BB-' + Math.floor(Math.random() * 10000),
                                    firstName: addFormData.firstName || 'Unknown',
                                    lastName: addFormData.lastName || 'User',
                                    phone: addFormData.phone,
                                    email: addFormData.email,
                                    address: addFormData.address,
                                    location: realTelemetry.location,
                                    status: addFormData.status,
                                    role: addFormData.role || 'Employee',
                                    browser: realTelemetry.browser,
                                    externalIp: realTelemetry.ip,
                                    createdBy: 'Admin',
                                    lastEditBy: 'Admin',
                                    avatar: addFormData.avatar || null
                                };

                                // Optimistic UI update without a UUID yet
                                const optimisticUser = { ...newUser, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() };
                                setUsers(prev => [optimisticUser, ...prev]);
                                setIsAddModalOpen(false);
                                setAddFormData({
                                    firstName: '', lastName: '', phone: '', email: '', 
                                    address: '', location: '', status: 'Active', role: 'Trainee', avatar: ''
                                });

                                // Perform live DB insert
                                const { data } = await supabase.from('users').insert(newUser).select().single();
                                if (data) {
                                    setUsers(prev => prev.map(u => u.id === optimisticUser.id ? {
                                        ...data,
                                        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : '',
                                        updatedAt: data.lastEditAt ? new Date(data.lastEditAt).toISOString().split('T')[0] : ''
                                    } : u));
                                }
                            }} style={saveBtnStyle}>
                                <Plus size={16} /> Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Modal Styles
const modalOverlayStyle: CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalContentStyle: CSSProperties = {
    background: '#fff', borderRadius: '16px', padding: '32px',
    width: '600px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};
const closeBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary-light)'
};
const labelStyle: CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary-light)', marginBottom: '6px'
};
const inputStyle: CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)',
    background: 'var(--background-light, #f8fafc)', fontSize: '14px', boxSizing: 'border-box'
};
const cancelBtnStyle: CSSProperties = {
    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)',
    background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 500
};
const saveBtnStyle: CSSProperties = {
    padding: '10px 24px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--primary, #f6a800)', color: '#000', cursor: 'pointer', fontSize: '14px', fontWeight: 600
};
