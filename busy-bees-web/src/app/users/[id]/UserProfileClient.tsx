'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Building2, User, Globe, ArrowLeft, X, Save, Camera } from 'lucide-react';
import Link from 'next/link';
import Autocomplete from 'react-google-autocomplete';
import AvailabilityCalendar from './AvailabilityCalendar';
import styles from './page.module.css';
import type { CSSProperties } from 'react';

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

interface UserData {
    id: number | string;
    employeeId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    role: string;
    location: string;
    externalIp: string;
    browser: string;
    status: string;
    avatar: string;
    [key: string]: any;
}

export default function UserProfileClient({ initialUser }: { initialUser: UserData }) {
    const [user, setUser] = useState<UserData>(initialUser);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state corresponding to editable fields
    const [formData, setFormData] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        address: user.address,
        location: user.location,
        status: user.status,
        avatar: user.avatar || ''
    });

    const saveToStorage = (newData: UserData) => {
        localStorage.setItem(`user_profile_${newData.id}`, JSON.stringify(newData));
    };

    useEffect(() => {
        let hydratedUser = user;

        // 1. Scan custom users first
        const customSaved = localStorage.getItem('custom_users');
        if (customSaved) {
            const customUsers = JSON.parse(customSaved);
            const foundCustom = customUsers.find((u: any) => u.id.toString() === user.id.toString());
            if (foundCustom) hydratedUser = foundCustom;
        }

        // 2. Override with individual profile saves if they exist
        const individualSave = localStorage.getItem(`user_profile_${user.id}`);
        if (individualSave) {
            hydratedUser = JSON.parse(individualSave);
        }

        if (hydratedUser.id) {
            setUser(hydratedUser);
            setFormData({
                firstName: hydratedUser.firstName || '',
                lastName: hydratedUser.lastName || '',
                phone: hydratedUser.phone || '',
                email: hydratedUser.email || '',
                address: hydratedUser.address || '',
                location: hydratedUser.location || '',
                status: hydratedUser.status || 'Active',
                avatar: hydratedUser.avatar || ''
            });
        }
    }, [user.id]);

    const handleSave = () => {
        const newData = { ...user, ...formData };
        setUser(newData);
        saveToStorage(newData);
        setIsEditing(false);
    };

    const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setFormData(prev => ({ ...prev, avatar: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header / Breadcrumb */}
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/users" className={styles.backButton}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className={styles.title}>User Profile</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.statusBadge} data-status={user.status.toLowerCase()}>
                        {user.status}
                    </div>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className={styles.editBtn} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--primary)', color: '#000', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                    >
                        <User size={14} /> Edit Profile
                    </button>
                </div>
            </div>

            <div className={styles.contentGrid}>
                {/* Left Column: Overview Card */}
                <div className={styles.overviewCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarLarge} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                {user.avatar?.startsWith('data:image') ? (
                                    <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                                ) : (
                                    user.avatar
                                )}
                            </div>
                        </div>
                        <div className={styles.profileTitles}>
                            <h2>{user.firstName} {user.lastName}</h2>
                            <p className={styles.primaryRole}>{user.role}</p>
                            <p className={styles.employeeId}>ID: {user.employeeId}</p>
                        </div>
                    </div>

                    <div className={styles.detailsList}>
                        <div className={styles.detailItem}>
                            <Phone size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Phone Number</span>
                                <span className={styles.detailValue}>{user.phone}</span>
                            </div>
                        </div>
                        <div className={styles.detailItem}>
                            <Mail size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Email Address</span>
                                <span className={styles.detailValue}>{user.email}</span>
                            </div>
                        </div>
                        <div className={styles.detailItem}>
                            <MapPin size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Address</span>
                                <span className={styles.detailValue}>{user.address}</span>
                            </div>
                        </div>
                        <div className={styles.detailItem}>
                            <MapPin size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Current Location</span>
                                <span className={styles.detailValue}>
                                    {user.location ? (
                                        <a href={`https://www.google.com/maps?q=${encodeURIComponent(user.location)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }} className="hover-underline">
                                            {user.location}
                                        </a>
                                    ) : (
                                        <span style={{ color: 'var(--text-secondary-light)' }}>Unknown</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className={styles.detailItem}>
                            <Globe size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Usual Login IP</span>
                                <span className={styles.detailValue}>{user.externalIp}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Calendar / Availability Panel */}
                <div className={styles.calendarCard}>
                    <AvailabilityCalendar userId={user.employeeId} />
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Edit Profile</h2>
                            <button onClick={() => setIsEditing(false)} style={closeBtnStyle}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #ffc107 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: '#000', overflow: 'hidden' }}>
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        (formData.firstName?.[0] || 'U') + (formData.lastName?.[0] || '')
                                    )}
                                </div>
                                <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1px solid var(--border-light)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <Camera size={16} color="var(--text-main)" />
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
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
                            <button onClick={() => setIsEditing(false)} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={handleSave} style={saveBtnStyle}>
                                <Save size={16} /> Save Changes
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
