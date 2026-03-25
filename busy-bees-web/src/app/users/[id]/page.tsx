import { Mail, Phone, MapPin, Building2, User, Globe, ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import Link from 'next/link';
import AvailabilityCalendar from './AvailabilityCalendar';
import styles from './page.module.css';

// Mock DB wrapper for dynamic route data
// Mock DB wrapper for dynamic route data
// In a real app, this is fetched via API or ORM based on params.id
const fetchUser = async (id: string) => {
    // Shared mock structure with the Users list page
    const MOCK_USERS = [
        {
            id: 1,
            employeeId: 'EPM-1001',
            firstName: 'Sarah',
            lastName: 'Connor',
            phone: '555-0101',
            email: 'sarah@busybees.com',
            address: '123 SkyNet Blvd, LA',
            role: 'Senior Technician',
            location: 'Acme Corp',
            externalIp: '192.168.1.5',
            browser: 'Chrome 120',
            status: 'Active',
            createdAt: '2025-01-10 08:00',
            createdBy: 'Admin',
            updatedAt: '2025-10-24 09:15',
            updatedBy: 'Self',
            avatar: 'SC'
        },
        {
            id: 2,
            employeeId: 'EPM-1002',
            firstName: 'Kyle',
            lastName: 'Reese',
            phone: '555-0102',
            email: 'kyle@busybees.com',
            address: '45 Future Ln, LA',
            role: 'Field Specialist',
            location: 'Last seen: HQ',
            externalIp: '172.16.0.2',
            browser: 'Safari 17',
            status: 'Offline',
            createdAt: '2025-02-15 10:30',
            createdBy: 'Sarah Connor',
            updatedAt: '2025-10-24 08:00',
            updatedBy: 'System',
            avatar: 'KR'
        },
    ];
    return MOCK_USERS.find(e => e.id.toString() === id) || MOCK_USERS[0];
};

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15+ async params
    const resolvedParams = await params;
    const user = await fetchUser(resolvedParams.id);

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
                    <button className={styles.editBtn} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--primary)', color: '#000', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                        <User size={14} /> Edit Profile
                    </button>
                </div>
            </div>

            <div className={styles.contentGrid}>
                {/* Left Column: Overview Card */}
                <div className={styles.overviewCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.avatarLarge}>{user.avatar}</div>
                        <div className={styles.profileTitles}>
                            <h2>{user.firstName} {user.lastName}</h2>
                            <p className={styles.primaryRole}>{user.role}</p>
                            <p className={styles.employeeId}>ID: {user.employeeId}</p>
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <a href={`tel:${user.phone}`} className={styles.actionBtn}>
                            <Phone size={18} /> Call
                        </a>
                        <a href={`mailto:${user.email}`} className={styles.actionBtn}>
                            <Mail size={18} /> Email
                        </a>
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
                            <Building2 size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>Current Location</span>
                                <span className={styles.detailValue}>{user.location}</span>
                            </div>
                        </div>
                        <div className={styles.detailItem}>
                            <Globe size={16} className={styles.detailIcon} />
                            <div>
                                <span className={styles.detailLabel}>External IP</span>
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
        </div>
    );
}
