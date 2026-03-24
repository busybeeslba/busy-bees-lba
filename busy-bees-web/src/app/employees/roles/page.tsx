'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ArrowUpDown, Pencil, Trash2, X, Filter } from 'lucide-react';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import styles from './page.module.css';
import { dbClient } from '@/lib/dbClient';


type PermissionLevel = 'Full Control' | 'Partial Control' | 'View Only' | 'No Access';

interface Permissions {
    mobileApp: PermissionLevel;
    webApp: PermissionLevel;
    services: PermissionLevel;
    clients: PermissionLevel;
    sessions: PermissionLevel;
    forms: PermissionLevel;
    reports: PermissionLevel;
    users: PermissionLevel;
}

interface Role {
    id: string | number;
    name: string;
    description?: string;
    permissions: Permissions;
}

const DEFAULT_PERMISSIONS: Permissions = {
    mobileApp: 'No Access',
    webApp: 'View Only',
    services: 'View Only',
    clients: 'View Only',
    sessions: 'View Only',
    forms: 'View Only',
    reports: 'View Only',
    users: 'No Access'
};

const PERMISSION_OPTIONS: PermissionLevel[] = ['Full Control', 'Partial Control', 'View Only', 'No Access'];

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPermissions, setFormPermissions] = useState<Permissions>({ ...DEFAULT_PERMISSIONS });
    const [saving, setSaving] = useState(false);

    // Filter & Sort State
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        dbClient.get('/roles')
            .then((data: Role[]) => setRoles(data));
    }, []);

    // ── Modal Actions ─────────────────────────────────────────────
    const openAdd = () => {
        setEditingRole(null);
        setFormName('');
        setFormDescription('');
        setFormPermissions({ ...DEFAULT_PERMISSIONS });
        setIsModalOpen(true);
    };

    const openEdit = (role: Role) => {
        setEditingRole(role);
        setFormName(role.name);
        setFormDescription(role.description || '');
        setFormPermissions({ ...role.permissions });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    // ── Save & Delete ─────────────────────────────────────────────
    const handleSave = async () => {
        if (!formName.trim()) {
            alert('Role name is required.');
            return;
        }

        setSaving(true);
        const payload = {
            name: formName.trim(),
            description: formDescription.trim(),
            permissions: formPermissions
        };

        try {
            if (editingRole) {
                const savedRole = await dbClient.patch(`/roles/${editingRole.id}`, payload);
                setRoles((prev) => prev.map((r) => (r.id === savedRole.id ? savedRole : r)));
            } else {
                const savedRole = await dbClient.post('/roles', payload);
                setRoles((prev) => [...prev, savedRole]);
            }
            closeModal();
        } catch {
            alert('Could not save role. Make sure the database is running on port 3011.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string | number) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await dbClient.delete(`/roles/${id}`);
            setRoles(prev => prev.filter(r => r.id !== id));
        } catch {
            alert('Could not delete role.');
        }
    };

    // ── Filtering & Sorting ───────────────────────────────────────
    const filteredByRules = useDataFilter({ data: roles, rules: filterRules, matchType });

    const filteredRoles = useMemo(() => {
        return filteredByRules.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [filteredByRules, searchQuery]);

    const sortedRoles = useMemo(() => {
        if (!sortConfig) return filteredRoles;
        return [...filteredRoles].sort((a, b) => {
            if (a.name < b.name) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a.name > b.name) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredRoles, sortConfig]);

    const handleSort = () => {
        setSortConfig(prev => ({
            key: 'name',
            direction: prev?.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className={styles.addBtn} onClick={openAdd}>
                        <Plus size={20} />
                        <span>Add New Role</span>
                    </button>
                    <button className={styles.filterBtn} onClick={() => setShowFilterDrawer(true)}>
                        <Filter size={16} color="currentColor" />
                        <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                    </button>
                </div>
            </div>

            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="roles_list"
                columns={[
                    { id: 'name', label: 'Role Name' },
                    { id: 'description', label: 'Description' },
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, type) => {
                    setFilterRules(rules);
                    setMatchType(type);
                    setShowFilterDrawer(false);
                }}
            />

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={handleSort} style={{ cursor: 'pointer', width: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Role Name
                                    <ArrowUpDown size={14} color={sortConfig ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th>Description</th>
                            <th>Mobile App</th>
                            <th>Web App</th>
                            <th>Services</th>
                            <th>Clients</th>
                            <th>Sessions</th>
                            <th>Forms</th>
                            <th>Reports</th>
                            <th>Users</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRoles.length > 0 ? sortedRoles.map(role => (
                            <tr key={role.id}>
                                <td><span style={{ fontWeight: 600 }}>{role.name}</span></td>
                                <td>{role.description || <span style={{ color: 'var(--text-secondary-light)', fontStyle: 'italic' }}>None</span>}</td>
                                <td>{role.permissions.mobileApp}</td>
                                <td>{role.permissions.webApp}</td>
                                <td>{role.permissions.services}</td>
                                <td>{role.permissions.clients}</td>
                                <td>{role.permissions.sessions}</td>
                                <td>{role.permissions.forms}</td>
                                <td>{role.permissions.reports}</td>
                                <td>{role.permissions.users}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                        <button className={styles.actionBtn} title="Edit" onClick={() => openEdit(role)}>
                                            <Pencil size={18} />
                                        </button>
                                        <button className={styles.actionBtn} style={{ color: 'var(--error)' }} title="Delete" onClick={() => handleDelete(role.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary-light)' }}>
                                    No roles found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Modal ─────────────────────────────────────────────────── */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            <button onClick={closeModal} style={closeBtnStyle}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Role Name</label>
                            <input
                                style={{ ...inputStyle, width: '100%', maxWidth: '100%' }}
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="e.g. Field Supervisor"
                                autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Description (Optional)</label>
                            <input
                                style={{ ...inputStyle, width: '100%', maxWidth: '100%' }}
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                placeholder="e.g. Can view client data but cannot modify project records"
                            />
                        </div>

                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                            Permissions Configuration
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                            {(Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]).map(key => (
                                <div key={key}>
                                    <label style={labelStyle}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </label>
                                    <select
                                        style={inputStyle}
                                        value={formPermissions[key]}
                                        onChange={e => setFormPermissions(prev => ({ ...prev, [key]: e.target.value as PermissionLevel }))}
                                    >
                                        {PERMISSION_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button onClick={closeModal} style={cancelBtnStyle}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
                                {saving ? 'Saving…' : editingRole ? 'Save Changes' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Inline Styles ───────────────────────────────────────────────────────
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const modalContentStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '16px', padding: '32px',
    width: '600px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    color: 'var(--text-secondary-light)'
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: 'var(--text-secondary-light)', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-light, #e2e8f0)',
    background: 'var(--background-light, #f8fafc)',
    fontSize: '14px', color: 'var(--text-main, #1e293b)',
    boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
    padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-light, #e2e8f0)',
    background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
};

const saveBtnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: '8px', border: 'none',
    background: 'var(--primary, #f6a800)', color: '#000',
    cursor: 'pointer', fontSize: '14px', fontWeight: 600,
};
