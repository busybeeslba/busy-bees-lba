'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, MoreHorizontal, Phone, Mail, MapPin, Globe, Monitor, Filter, ArrowUpDown, User } from 'lucide-react';
import Link from 'next/link';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import styles from './page.module.css';

// Extended Mock Data
const MOCK_STAFF = [
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
    {
        id: 3,
        employeeId: 'EPM-1003',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-0103',
        email: 'john@busybees.com',
        address: '88 Generic Rd, NY',
        role: 'Trainee',
        location: 'Transit',
        externalIp: '10.0.0.50',
        browser: 'Firefox 121',
        status: 'Active',
        createdAt: '2025-05-20 14:00',
        createdBy: 'Admin',
        updatedAt: '2025-10-24 10:45',
        updatedBy: 'Self',
        avatar: 'JD'
    },
    {
        id: 4,
        employeeId: 'EPM-1004',
        firstName: 'Ellen',
        lastName: 'Ripley',
        phone: '555-0104',
        email: 'ellen@busybees.com',
        address: '99 Nostromo Way, Space',
        role: 'Supervisor',
        location: 'Last seen: Warehouse',
        externalIp: '192.168.100.1',
        browser: 'Edge 119',
        status: 'Offline',
        createdAt: '2025-01-05 09:00',
        createdBy: 'Admin',
        updatedAt: '2025-10-23 18:30',
        updatedBy: 'Self',
        avatar: 'ER'
    },
];

export default function StaffPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredByRules = useDataFilter({ data: MOCK_STAFF, rules: filterRules, matchType });

    const sortedStaff = useMemo(() => {
        let sortableItems = filteredByRules.filter((staff: any) =>
            Object.values(staff).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
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

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className={styles.addBtn}>
                        <Plus size={20} />
                        <span>Add New Employee</span>
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
                storageKey="staff_list"
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
                            <th onClick={() => handleSort('externalIp')} style={{ minWidth: '120px', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    External IP
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
                        {sortedStaff.map((staff) => (
                            <tr key={staff.id}>
                                <td><span style={{ fontWeight: 600 }}>{staff.employeeId}</span></td>
                                <td>{staff.firstName}</td>
                                <td>{staff.lastName}</td>
                                <td>{staff.phone}</td>
                                <td>{staff.email}</td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{staff.address}</span></td>
                                <td><span style={{ padding: '4px 8px', backgroundColor: 'var(--background-light)', borderRadius: '4px', fontSize: '12px' }}>{staff.role}</span></td>
                                <td>
                                    <div className={styles.locationCell}>
                                        <MapPin size={14} color="var(--text-secondary-light)" />
                                        {staff.location}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary-light)' }}>
                                        <Globe size={12} />
                                        {staff.externalIp}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary-light)' }}>
                                        <Monitor size={12} />
                                        {staff.browser}
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${staff.status === 'Active' ? styles.active : styles.offline}`}>
                                        {staff.status}
                                    </span>
                                </td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{staff.createdAt}</span></td>
                                <td><span style={{ fontSize: '12px' }}>{staff.createdBy}</span></td>
                                <td><span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{staff.updatedAt}</span></td>
                                <td><span style={{ fontSize: '12px' }}>{staff.updatedBy}</span></td>
                                <td style={{ position: 'sticky', right: 0, backgroundColor: 'white', borderLeft: '1px solid var(--border-light)' }}>
                                    <div className={styles.contactIcons}>
                                        <Link href={`/employees/${staff.id}`} title="View Profile">
                                            <button style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--primary)' }}>
                                                <User size={16} />
                                            </button>
                                        </Link>
                                        <button title="Call" onClick={() => window.open(`tel:${staff.phone}`)}>
                                            <Phone size={16} />
                                        </button>
                                        <button title="Email" onClick={() => window.open(`mailto:${staff.email}`)}>
                                            <Mail size={16} />
                                        </button>
                                        <button title="More Options" onClick={() => alert(`Open settings for ${staff.firstName} ${staff.lastName}`)}>
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '16px 24px', color: 'var(--text-secondary-light)', fontSize: '13px', borderTop: '1px solid var(--border-light)', backgroundColor: '#f9fafb', fontWeight: 500 }}>
                    Showing {sortedStaff.length} rows
                </div>
            </div>
        </div>
    );
}
