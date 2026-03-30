'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Phone, Mail, MapPin, Building2, X, FileText, Calendar, User, Pencil, Trash2, MoreVertical, Clock, Filter, ArrowUpDown, Maximize2, Minimize2, LayoutDashboard, PanelTop } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import AddClientModal from '@/components/clients/AddClientModal';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import FacetedFilter from '@/components/ui/FacetedFilter';
import styles from './page.module.css';
import { MOCK_AVAILABLE_SERVICES } from '@/lib/mockData';
import ProgramCategoriesSection, { ProgramCategory } from '@/components/clients/ProgramCategoriesSection';
import { dbClient } from '@/lib/dbClient';


const MOCK_CLIENTS: any[] = [];

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [detailWidth, setDetailWidth] = useState<number>(0); // Initialize as 0, will set in effect
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [availableServices, setAvailableServices] = useState<any[]>(MOCK_AVAILABLE_SERVICES);
    const [providers, setProviders] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    const [editingClient, setEditingClient] = useState<typeof MOCK_CLIENTS[0] | null>(null);

    // Client forms fetched from shared DB
    const [clientForms, setClientForms] = useState<any[]>([]);
    const [clientFormsLoading, setClientFormsLoading] = useState(false);
    const [selectedFormType, setSelectedFormType] = useState<string | null>(null);
    const [expandedDetail, setExpandedDetail] = useState(false);
    const [expandedFormDetail, setExpandedFormDetail] = useState(false);
    const [formPanelWidth, setFormPanelWidth] = useState<number | null>(null);
    const formPanelRef = useRef<HTMLElement | null>(null);

    const startFormResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startFormWidth = formPanelRef.current?.getBoundingClientRect().width ?? 380;
        const startDetailWidth = sidebarRef.current?.getBoundingClientRect().width ?? 500;
        const onMove = (me: MouseEvent) => {
            const delta = startX - me.clientX; // drag left → form grows, detail shrinks
            setFormPanelWidth(Math.max(260, Math.min(700, startFormWidth + delta)));
            setDetailWidth(Math.max(300, Math.min(800, startDetailWidth - delta)));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [sidebarRef]);

    // Advanced Filter State
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);

    // Fetch all forms for the selected client whenever it changes
    useEffect(() => {
        if (!selectedClient) { setClientForms([]); return; }
        setClientFormsLoading(true);
        const cid = selectedClient.clientId || `CLI-${selectedClient.id}`;
        Promise.all([
            dbClient.get('/academic_baselines').catch(() => []),
            dbClient.get('/probes').catch(() => []),
            dbClient.get('/program_mastery').catch(() => []),
        ]).then(([baselines, probes, mastery]) => {
            const matchesClient = (r: any) =>
                r.clientId === cid ||
                r.clientId === String(selectedClient.id) ||
                r.clientName === selectedClient.kidsName ||
                r.clientName === selectedClient.name;
            const mapped = [
                ...baselines.filter(matchesClient).map((r: any) => ({ ...r, formType: 'Academic Baseline' })),
                ...probes.filter(matchesClient).map((r: any) => ({ ...r, formType: 'Probe Data' })),
                ...(Array.isArray(mastery) ? mastery : []).filter(matchesClient).map((r: any) => ({ ...r, formType: 'Baseline Sheet' })),
            ].sort((a, b) => (b.date || b.createdAt || b.timestamp || '').localeCompare(a.date || a.createdAt || a.timestamp || ''));
            setClientForms(mapped);
        }).finally(() => setClientFormsLoading(false));
    }, [selectedClient]);



    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Helper to get service name
    const getServiceName = (serviceId: string) => {
        const srv = availableServices.find(s => s.serviceId === serviceId);
        return srv ? srv.name : serviceId;
    };

    // Helper to get provider name
    const getServiceProvider = (serviceId: string) => {
        const srv = availableServices.find(s => s.serviceId === serviceId);
        return srv && srv.provider ? srv.provider : 'Unassigned';
    };

    // Helper to assign consistent colors to providers
    const getProviderStyle = (providerName: string) => {
        if (!providerName || providerName === 'Unassigned') return { backgroundColor: '#94a3b8', color: '#ffffff' }; // default gray

        const pObj = providers.find(p => p.name === providerName);
        if (pObj && pObj.color) return { backgroundColor: pObj.color, color: pObj.textColor || '#ffffff' };

        let hash = 0;
        for (let i = 0; i < providerName.length; i++) {
            hash = providerName.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Define a palette of nice colors
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
            '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
        ];

        const index = Math.abs(hash) % colors.length;
        return { backgroundColor: colors[index], color: '#ffffff' };
    };

    const calculateAge = (dob: string) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            // Since we are in an effect dependent on isResizing, 
            // valid checks are implicit but good to keep
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setDetailWidth(newWidth);
            }
        };

        const stopResizing = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', stopResizing);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', stopResizing);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);
    // Set initial 50% width on client side
    useEffect(() => {
        // Assume default sidebar width ~240px and gaps. Realistically, (window.innerWidth - sidebar) / 2 is the 50% mark.
        // A safe assumption for a 50/50 split visually is half the window width minus navigation overhead.
        setDetailWidth(Math.floor(window.innerWidth / 2) - 150);
    }, []);

    // Load clients from shared database on mount
    useEffect(() => {
        dbClient.get('/clients')
            .then((data: any[]) => {
                // Map shared-db format to the shape this page already expects
                const mapped = data.map((c: any) => {
                    // Defensive: parse programCategories if stored as a JSON string
                    let programCategories = c.programCategories || [];
                    if (typeof programCategories === 'string') {
                        try { programCategories = JSON.parse(programCategories); } catch { programCategories = []; }
                    }
                    return {
                        clientId: c.id || c.clientId,
                        _dbId: c.id,          // keep the real DB id for PATCH/DELETE
                        kidsName: c.kidsName || c.name || '',
                        guardian: c.guardian || '',
                        guardianLastName: c.guardianLastName || '',
                        address: c.address || '',
                        phone: c.phone || c.contactPhone || '',
                        dob: c.dob || '',
                        email: c.email || c.contactEmail || '',
                        teacher: c.teacher || '',
                        services: c.services || '',
                        assignedPrograms: c.assignedPrograms || '',
                        programCategories,
                        programPercentage: c.programPercentage || '0%',
                        iepMeeting: c.iepMeeting || '',
                        status: c.status || 'Active',
                        addresses: c.addresses,
                        phones: c.phones,
                        emails: c.emails,
                    };
                });
                setClients(mapped);
            })
            .catch(() => {
                console.warn('⚠️  Shared database not reachable on port 3011.');
            });

        const savedServices = localStorage.getItem('busy_bees_services');
        if (savedServices) {
            try { setAvailableServices(JSON.parse(savedServices)); } catch { }
        }
        const savedProviders = localStorage.getItem('busy_bees_providers');
        if (savedProviders) {
            try { setProviders(JSON.parse(savedProviders)); } catch { }
        }

        dbClient.get('/users')
            .then(data => setUsersList(data))
            .catch(() => console.warn('Could not fetch users for employee resolution'));
    }, []);


    const handleSaveClient = async (clientData: any) => {
        const primaryAddress = clientData.addresses?.find((a: any) => a.isPrimary) || clientData.addresses?.[0];
        const primaryPhone = clientData.phones?.find((p: any) => p.isPrimary) || clientData.phones?.[0];
        const primaryEmail = clientData.emails?.find((e: any) => e.isPrimary) || clientData.emails?.[0];

        const dbPayload = {
            // shared-db / mobile-friendly fields
            id: clientData.id || Date.now(),
            name: `${clientData.firstName} ${clientData.lastName}`,
            // clients-page display fields
            kidsName: `${clientData.firstName} ${clientData.lastName}`,
            guardian: clientData.guardian || '',
            guardianLastName: clientData.guardianLastName || '',
            address: primaryAddress?.value || '',
            phone: primaryPhone?.value || '',
            dob: clientData.dob || '',
            email: primaryEmail?.value || '',
            teacher: clientData.teacher || '',
            services: clientData.services,
            assignedPrograms: clientData.assignedPrograms || '',
            programCategories: clientData.programCategories || [],
            programPercentage: clientData.programPercentage || '0%',
            iepMeeting: clientData.iepMeeting || '',
            status: clientData.status || 'Active',
            addresses: clientData.addresses,
            phones: clientData.phones,
            emails: clientData.emails,
        };

        try {
            let saved: any;
            if (clientData.id) {
                // Edit existing — PATCH to DB
                saved = await dbClient.patch(`/clients/${clientData.id}`, dbPayload);
                const mapped = { ...saved, clientId: saved.id, _dbId: saved.id };
                setClients(prev => prev.map(c => c._dbId === saved.id ? mapped : c));
                setSelectedClient(mapped);
            } else {
                // Add new — POST to DB
                saved = await dbClient.post('/clients', dbPayload);
                const mapped = { ...saved, clientId: saved.id, _dbId: saved.id };
                setClients(prev => [...prev, mapped]);
                setSelectedClient(mapped);
            }
        } catch {
            alert('Could not save client — is the shared database running on port 3011?');
        }

        setEditingClient(null);
    };


    const handleEditClient = async (client: any) => {
        setActiveActionId(null); // Close menu immediately
        try {
            // Always fetch fresh client data so programCategories (and any other live-edited fields) are current
            const dbId = client.id || client._dbId;
            if (dbId) {
                try {
                    const fresh = await dbClient.get(`/clients/${dbId}`);
                    if (fresh && typeof fresh.programCategories === 'string') {
                        try { fresh.programCategories = JSON.parse(fresh.programCategories); }
                        catch { fresh.programCategories = []; }
                    }
                    setEditingClient(fresh);
                    setIsAddModalOpen(true);
                    return;
                } catch (e) { console.error('Error fetching fresh client data', e); }
            }
        } catch { /* fall through */ }
        // Fallback: use the passed client object
        setEditingClient(client);
        setIsAddModalOpen(true);
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!confirm('Are you sure you want to delete this client?')) return;
        const target = clients.find(c => c.clientId === clientId);
        const dbId = target?._dbId || clientId;
        try {
            await dbClient.delete(`/clients/${dbId}`);
            const updated = clients.filter(c => c.clientId !== clientId);
            setClients(updated);
            if (selectedClient?.clientId === clientId) setSelectedClient(null);
        } catch {
            alert('Could not delete client — is the shared database running on port 3011?');
        }
        setActiveActionId(null);
    };


    const toggleActionMenu = (e: React.MouseEvent, clientId: string) => {
        e.stopPropagation(); // Prevent row selection
        setActiveActionId(activeActionId === clientId ? null : clientId);
    };

    // Apply Advanced Filters
    let filteredClients = useDataFilter({
        data: clients,
        rules: filterRules,
        matchType
    });

    if (sortConfig !== null) {
        filteredClients = [...filteredClients].sort((a: any, b: any) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return (
        <div className={styles.container}>
            {/* Toolbar - Now includes Add Client Button */}
            <div className={styles.toolbar}>
                <div className={styles.leftActions}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input type="text" placeholder="Search clients..." className={styles.searchInput} />
                    </div>
                </div>
                <div className={styles.rightActions}>
                    <button
                        className={styles.addBtn}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus size={20} />
                        <span>Add New Client</span>
                    </button>
                    <button
                        className={styles.filterBtn}
                        onClick={() => setShowFilterDrawer(true)}
                    >
                        <Filter size={16} color="currentColor" />
                        <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                    </button>
                    <button className={styles.moreActionsBtn}>
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="clients"
                columns={[
                    { id: 'clientId', label: 'Client ID' },
                    { id: 'kidsName', label: 'Child Name' },
                    { id: 'guardian', label: 'Guardian' },
                    { id: 'address', label: 'Address' },
                    { id: 'phone', label: 'Phone' },
                    { id: 'email', label: 'Email' },
                    { id: 'teacher', label: 'Teacher' }
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, matchType) => {
                    setFilterRules(rules);
                    setMatchType(matchType);
                    setShowFilterDrawer(false);
                }}
            />

            {/* Content Area - Split View */}
            <div className={styles.contentWrapper}>
                {/* Clients Table */}
                <div className={`${styles.tableWrapper} ${selectedClient ? styles.tableWrapperShrink : ''}`}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('clientId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Client ID
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'clientId' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('kidsName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Child Name
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'kidsName' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('dob')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Age
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'dob' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('guardian')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Guardian
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'guardian' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('guardianLastName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Guardian Last Name
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'guardianLastName' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Status
                                            <ArrowUpDown size={14} color={sortConfig?.key === 'status' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                        </div>
                                    </th>
                                    {!selectedClient && (
                                        <>
                                            <th onClick={() => handleSort('address')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Address
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'address' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Phone
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'phone' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('dob')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Date of Birth
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'dob' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Email
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'email' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('teacher')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Teacher's
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'teacher' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th>Services</th>
                                            <th>Service Provider</th>
                                            <th onClick={() => handleSort('assignedPrograms')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Program Description
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'assignedPrograms' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th>Program Categories</th>
                                            <th>Sub-categories</th>
                                            <th onClick={() => handleSort('programPercentage')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Program %
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'programPercentage' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('iepMeeting')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    IEP Meeting
                                                    <ArrowUpDown size={14} color={sortConfig?.key === 'iepMeeting' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                                </div>
                                            </th>
                                        </>
                                    )}
                                    <th style={{ textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client.clientId}
                                        className={`${selectedClient?.clientId === client.clientId ? styles.selectedRow : ''}`}
                                        onClick={() => router.push(`/clients/${encodeURIComponent(client.clientId)}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td><span className={styles.cellText}>CLI-{client.clientId}</span></td>
                                        <td><span className={styles.clientName}>{client.kidsName}</span></td>
                                        <td><span className={styles.cellText}>{calculateAge(client.dob)}</span></td>
                                        <td><span className={styles.cellText}>{client.guardian}</span></td>
                                        <td><span className={styles.cellText}>{(client as any).guardianLastName}</span></td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${client.status === 'Active' ? styles.active : styles.inactive}`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        {!selectedClient && (
                                            <>
                                                <td><span className={styles.cellText}>{client.address}</span></td>
                                                <td><span className={styles.cellText}>{client.phone}</span></td>
                                                <td><span className={styles.cellText}>{client.dob}</span></td>
                                                <td><span className={styles.cellText}>{client.email}</span></td>
                                                <td><span className={styles.cellText}>{client.teacher}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {Array.isArray(client.services)
                                                            ? client.services.map((s: any, idx: number) => {
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={styles.serviceBubble}
                                                                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                                                                    >
                                                                        {getServiceName(s.serviceId)}
                                                                    </span>
                                                                );
                                                            })
                                                            : <span className={styles.cellText}>{client.services || 'None'}</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {Array.isArray(client.services)
                                                            ? Array.from(new Set(client.services.map((s: any) => {
                                                                const srvAssignedUser = usersList.find(u => u.id === s.providerId);
                                                                return srvAssignedUser 
                                                                    ? `${srvAssignedUser.firstName} ${srvAssignedUser.lastName}` 
                                                                    : getServiceProvider(s.serviceId);
                                                            }))).map((providerName: unknown, idx: number) => {
                                                                const name = providerName as string;
                                                                const providerStyle = getProviderStyle(name);
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={styles.serviceBubble}
                                                                        style={providerStyle}
                                                                    >
                                                                        {name}
                                                                    </span>
                                                                );
                                                            })
                                                            : <span className={styles.cellText}>—</span>}
                                                    </div>
                                                </td>
                                                {/* Program Description (old assignedPrograms text) */}
                                                <td><span className={styles.cellText}>{client.assignedPrograms || '—'}</span></td>

                                                {/* Program Categories Name */}
                                                <td>
                                                    {(() => {
                                                        const cats: ProgramCategory[] = client.programCategories || [];
                                                        if (cats.length === 0) return <span className={styles.cellText}>—</span>;
                                                        const shown = cats.slice(0, 2);
                                                        const extra = cats.length - shown.length;
                                                        return (
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                {shown.map((c: ProgramCategory) => (
                                                                    <span key={c.id} style={{ fontSize: '11px', fontWeight: 600, background: '#f0f4ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '100px' }}>{c.name}</span>
                                                                ))}
                                                                {extra > 0 && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>+{extra}</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Program Sub-categories */}
                                                <td>
                                                    {(() => {
                                                        const cats: ProgramCategory[] = client.programCategories || [];
                                                        const allSubs = cats.flatMap(c => c.targets.map(t => t.name));
                                                        if (allSubs.length === 0) return <span className={styles.cellText}>—</span>;
                                                        const shown = allSubs.slice(0, 3);
                                                        const extra = allSubs.length - shown.length;
                                                        return (
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                {shown.map((s, i) => (
                                                                    <span key={i} style={{ fontSize: '11px', fontWeight: 600, background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: '100px' }}>{s}</span>
                                                                ))}
                                                                {extra > 0 && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>+{extra}</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td><span className={styles.cellText}>{client.programPercentage}</span></td>
                                                <td><span className={styles.cellText}>{client.iepMeeting}</span></td>
                                            </>
                                        )}
                                        <td>
                                            <div className={styles.actionMenuContainer}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={(e) => toggleActionMenu(e, client.clientId)}
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {activeActionId === client.clientId && (
                                                    <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className={styles.dropdownItem}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveActionId(null);
                                                                setSelectedClient(client);
                                                            }}
                                                        >
                                                            <PanelTop size={16} />
                                                            <span>View Detail Card</span>
                                                        </button>
                                                        <button
                                                            className={styles.dropdownItem}
                                                            onClick={() => handleEditClient(client)}
                                                        >
                                                            <Pencil size={16} />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            className={`${styles.dropdownItem} ${styles.deleteItem}`}
                                                            onClick={() => handleDeleteClient(client.clientId)}
                                                        >
                                                            <Trash2 size={16} />
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '16px 24px', color: 'var(--text-secondary-light)', fontSize: '13px', borderTop: '1px solid var(--border-light)', backgroundColor: '#f9fafb', fontWeight: 500 }}>
                            Showing {filteredClients.length} rows
                        </div>
                    </div>
                </div>

                {/* Detail View (Right Panel) */}
                {selectedClient && (
                    <aside
                        className={`${styles.detailView} ${expandedDetail ? styles.detailViewExpanded : ''}`}
                        style={expandedDetail ? {} : {
                            width: detailWidth ? `${detailWidth}px` : '50%',
                            flexBasis: detailWidth ? `${detailWidth}px` : '50%',
                            flexShrink: 0
                        }}
                        ref={sidebarRef}
                    >
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={startResizing}
                        />
                        <div className={styles.detailCard}>
                            <div className={styles.detailHeader}>
                                <div
                                    className={`${styles.detailClientId} ${selectedClient.status === 'Active' ? styles.activeClientId : styles.inactiveClientId}`}
                                >
                                    Client ID: {selectedClient.clientId}
                                </div>

                                {/* Centered: avatar above, names centered below */}
                                <div className={styles.avatarLarge} style={{ alignSelf: 'center' }}>
                                    {(() => {
                                        const parts = (selectedClient.kidsName || '').trim().split(' ');
                                        const initials = parts.length >= 2
                                            ? `${parts[0][0]}${parts[parts.length - 1][0]}`
                                            : parts[0]?.[0] || '?';
                                        return <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '1px' }}>{initials.toUpperCase()}</span>;
                                    })()}
                                </div>
                                <div style={{ textAlign: 'center', width: '100%' }}>
                                    <label className={styles.detailLabel}>Child Name</label>
                                    <h2 className={styles.detailName}>{selectedClient.kidsName}</h2>
                                    <label className={styles.detailLabel}>Guardian Name</label>
                                    <p className={styles.detailGuardian}>{selectedClient.guardian} {(selectedClient as any).guardianLastName}</p>
                                </div>
                            </div>

                            <div className={styles.detailBody}>
                                {/* Contact Information Section */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>Contact Information</h3>
                                    <div className={styles.detailSectionBody}>
                                        <div className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <label>Email</label>
                                                {(selectedClient as any).emails && Array.isArray((selectedClient as any).emails) ? (
                                                    <div className={styles.multiEntryList}>
                                                        {[...(selectedClient as any).emails]
                                                            .sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                                                            .map((email: any) => (
                                                                <div key={email.id} className={styles.multiEntryItem}>
                                                                    <div className={styles.multiEntryLeft}>
                                                                        {email.isPrimary ? <span className={styles.primaryBadge}>P</span> : <span />}
                                                                        <span className={styles.multiEntryValue}>{email.value}</span>
                                                                    </div>
                                                                    <span className={styles.multiEntryType}>{email.type}</span>
                                                                    {email.isPrimary && (
                                                                        <a href={`mailto:${email.value}`} className={styles.contactActionBtn} title="Send email">
                                                                            <Mail size={14} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span>{selectedClient.email}</span>
                                                )}
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>Phone</label>
                                                {(selectedClient as any).phones && Array.isArray((selectedClient as any).phones) ? (
                                                    <div className={styles.multiEntryList}>
                                                        {[...(selectedClient as any).phones]
                                                            .sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                                                            .map((phone: any) => (
                                                                <div key={phone.id} className={styles.multiEntryItem}>
                                                                    <div className={styles.multiEntryLeft}>
                                                                        {phone.isPrimary ? <span className={styles.primaryBadge}>P</span> : <span />}
                                                                        <span className={styles.multiEntryValue}>{phone.value}</span>
                                                                    </div>
                                                                    <span className={styles.multiEntryType}>{phone.type}</span>
                                                                    {phone.isPrimary && (
                                                                        <a href={`tel:${phone.value}`} className={styles.contactActionBtn} title="Call">
                                                                            <Phone size={14} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span>{selectedClient.phone}</span>
                                                )}
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>Address</label>
                                                {(selectedClient as any).addresses && Array.isArray((selectedClient as any).addresses) ? (
                                                    <div className={styles.multiEntryList}>
                                                        {[...(selectedClient as any).addresses]
                                                            .sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                                                            .map((address: any) => (
                                                                <div key={address.id} className={styles.multiEntryItem}>
                                                                    <div className={styles.multiEntryLeft}>
                                                                        {address.isPrimary ? <span className={styles.primaryBadge}>P</span> : <span />}
                                                                        <span className={styles.multiEntryValue}>{address.value}</span>
                                                                    </div>
                                                                    <span className={styles.multiEntryType}>{address.type}</span>
                                                                    {address.isPrimary && (
                                                                        <a
                                                                            href={`https://maps.google.com/?q=${encodeURIComponent(address.value)}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className={styles.contactActionBtn}
                                                                            title="Open in Maps"
                                                                        >
                                                                            <MapPin size={14} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span>{selectedClient.address}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Details Section */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>Personal Details</h3>
                                    <div className={styles.detailSectionBody}>
                                        <div className={styles.infoGridTwoCol}>
                                            <div className={styles.infoItem}>
                                                <label>Date of Birth</label>
                                                <span>{selectedClient.dob}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>Age</label>
                                                <span>{calculateAge(selectedClient.dob)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Education Section */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>Education</h3>
                                    <div className={styles.detailSectionBody}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                            <div className={styles.infoItem}>
                                                <label>Teacher</label>
                                                <span>{selectedClient.teacher}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>IEP Meeting</label>
                                                <span>{selectedClient.iepMeeting}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Services Section */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>Services</h3>
                                    <div className={styles.infoGrid}>
                                        <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                                            {Array.isArray(selectedClient.services) && selectedClient.services.length > 0 ? (
                                                <table className={styles.detailServicesTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Assigned Provider</th>
                                                            <th>Service Name</th>
                                                            <th>Hours</th>
                                                            <th>Used</th>
                                                            <th>Remaining</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedClient.services as any[]).map((srv, idx) => {
                                                            const srvAssignedUser = usersList.find(u => u.id === srv.providerId);
                                                            const providerName = srvAssignedUser 
                                                                ? `${srvAssignedUser.firstName} ${srvAssignedUser.lastName}` 
                                                                : getServiceProvider(srv.serviceId);
                                                            const providerStyle = getProviderStyle(providerName);
                                                            const color = providerStyle.backgroundColor;

                                                            return (
                                                                <tr key={idx} style={{ backgroundColor: color }}>
                                                                    <td style={{ color: providerStyle.color }}>
                                                                        <span style={{ fontWeight: 600, color: providerStyle.color }}>
                                                                            {providerName}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ fontWeight: 500, color: providerStyle.color }}>{getServiceName(srv.serviceId)}</td>
                                                                    <td style={{ color: providerStyle.color }}>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <Clock size={14} color={providerStyle.color} />
                                                                            {srv.hours}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ color: providerStyle.color }}>0h</td>
                                                                    <td style={{ fontWeight: 600, color: providerStyle.color }}>{srv.hours}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary-light)' }}>
                                                    {selectedClient.services || 'None Assigned'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Program Section */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>Program</h3>
                                    <div className={styles.detailSectionBody}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                            <div className={styles.infoItem}>
                                                <label>Program Description</label>
                                                <span>{selectedClient.assignedPrograms || '—'}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>Program %</label>
                                                <span>{selectedClient.programPercentage || '—'}</span>
                                            </div>
                                        </div>
                                        <ProgramCategoriesSection
                                            clientId={selectedClient.id}
                                            categories={selectedClient.programCategories || []}
                                            onUpdate={(updated: ProgramCategory[]) => {
                                                setSelectedClient((c: any) => ({ ...c, programCategories: updated }));
                                                setClients((all: any[]) =>
                                                    all.map((cl: any) =>
                                                        cl.id === selectedClient.id
                                                            ? { ...cl, programCategories: updated }
                                                            : cl
                                                    )
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Forms Section — icon cards */}
                                <div className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>
                                        <FileText size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                        Forms
                                    </h3>
                                    {clientFormsLoading ? (
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)' }}>Loading…</p>
                                    ) : (
                                        <div className={styles.formIconsRow}>
                                            {[
                                                { key: 'Academic Baseline', label: 'Academic Baseline', icon: '📋', color: '#2563eb', bg: '#eff6ff' },
                                                { key: 'Probe Data', label: 'Probe Data', icon: '🔬', color: '#7c3aed', bg: '#f5f3ff' },
                                                { key: 'Baseline Sheet', label: 'Baseline Sheet', icon: '🏆', color: '#d97706', bg: '#fffbeb' },
                                            ].map(ft => {
                                                const count = clientForms.filter(f => f.formType === ft.key).length;
                                                const isActive = selectedFormType === ft.key;
                                                return (
                                                    <button
                                                        key={ft.key}
                                                        className={styles.formIconCard}
                                                        style={{
                                                            borderColor: isActive ? ft.color : 'var(--border-light)',
                                                            background: isActive ? ft.bg : 'white',
                                                        }}
                                                        onClick={() => setSelectedFormType(isActive ? null : ft.key)}
                                                        title={`View ${ft.label} records`}
                                                    >
                                                        <span className={styles.formIconEmoji}>{ft.icon}</span>
                                                        <span className={styles.formIconLabel} style={{ color: isActive ? ft.color : 'var(--text-light)' }}>{ft.label}</span>
                                                        <span className={styles.formIconBadge} style={{ background: ft.bg, color: ft.color }}>{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.headerActions}>
                                <button
                                    className={styles.expandDetailBtn}
                                    onClick={() => handleEditClient(selectedClient)}
                                    title="Edit client"
                                    style={{ color: '#4f46e5' }}
                                >
                                    <Pencil size={15} />
                                </button>
                                <button className={styles.expandDetailBtn} onClick={() => setExpandedDetail(e => !e)} title={expandedDetail ? 'Exit full screen' : 'Expand to full screen'}>
                                    {expandedDetail ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                </button>
                                <button className={styles.closeBtn} onClick={() => { setSelectedClient(null); setExpandedDetail(false); setSelectedFormType(null); }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Form detail panel — third column */}
                {selectedFormType && selectedClient && (() => {
                    const ftColor = selectedFormType === 'Academic Baseline' ? '#2563eb' : selectedFormType === 'Probe Data' ? '#7c3aed' : '#d97706';
                    const ftBg = selectedFormType === 'Academic Baseline' ? '#eff6ff' : selectedFormType === 'Probe Data' ? '#f5f3ff' : '#fffbeb';
                    const ftIcon = selectedFormType === 'Academic Baseline' ? '📋' : selectedFormType === 'Probe Data' ? '🔬' : '🏆';
                    const ftForms = clientForms.filter(f => f.formType === selectedFormType);

                    // Build chart data — count Success/Failed per date bucket
                    const buckets: Record<string, { success: number; failed: number }> = {};
                    ftForms.forEach(f => {
                        const d = f.date || (f.timestamp ? new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown');
                        if (!buckets[d]) buckets[d] = { success: 0, failed: 0 };
                        if (f.status === 'Success') buckets[d].success++;
                        else buckets[d].failed++;
                    });
                    const bucketList = Object.entries(buckets).slice(-8);
                    // Build recharts-compatible data
                    const chartData = bucketList.map(([date, v]) => ({ date, Success: v.success, Failed: v.failed }));

                    return (
                        <>
                            {/* Visible drag-strip resize handle between panels */}
                            <div
                                className={styles.panelResizeHandle}
                                onMouseDown={startFormResizing}
                                title="Drag to resize"
                            />
                            <aside
                                ref={formPanelRef as React.RefObject<HTMLElement>}
                                className={`${styles.formDetailAside} ${expandedFormDetail ? styles.detailViewExpanded : ''}`}
                                style={expandedFormDetail ? { animation: 'slideIn 0.3s ease-out' } : {
                                    width: formPanelWidth ? `${formPanelWidth}px` : undefined,
                                    flexBasis: formPanelWidth ? `${formPanelWidth}px` : undefined,
                                    flexShrink: 0,
                                    animation: 'slideIn 0.3s ease-out',
                                }}
                            >
                                <div className={styles.detailCard}>
                                    {/* Header */}
                                    <div className={styles.formDetailHeader} style={{ borderBottom: `3px solid ${ftColor}` }}>
                                        <span style={{ fontSize: '20px' }}>{ftIcon}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary-light)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                                {selectedClient.kidsName || selectedClient.name}
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: ftColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {selectedFormType}
                                            </div>
                                        </div>
                                        <span className={styles.formDetailCount} style={{ background: ftBg, color: ftColor }}>
                                            {ftForms.length}
                                        </span>
                                        <button
                                            className={styles.formIconBtn}
                                            onClick={() => setExpandedFormDetail(e => !e)}
                                            title={expandedFormDetail ? 'Collapse' : 'Expand to full width'}
                                        >
                                            {expandedFormDetail ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                        </button>
                                        <button
                                            className={styles.formIconBtn}
                                            onClick={() => { setSelectedFormType(null); setExpandedFormDetail(false); }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Scrollable body */}
                                    <div className={styles.detailBody}>
                                        {ftForms.length === 0 ? (
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)', fontStyle: 'italic', textAlign: 'center', paddingTop: '32px' }}>
                                                No {selectedFormType} records for this client yet.
                                            </p>
                                        ) : (
                                            <>
                                                {/* Chart */}
                                                <div className={styles.formDetailChartSection}>
                                                    <div className={styles.formDetailChartTitle}>Status Overview by Date</div>
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                                                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                                            />
                                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="Success"
                                                                stroke="#34a853"
                                                                strokeWidth={2.5}
                                                                dot={{ r: 4, fill: '#34a853', strokeWidth: 0 }}
                                                                activeDot={{ r: 6 }}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="Failed"
                                                                stroke="#ea4335"
                                                                strokeWidth={2.5}
                                                                strokeDasharray="5 3"
                                                                dot={{ r: 4, fill: '#ea4335', strokeWidth: 0 }}
                                                                activeDot={{ r: 6 }}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Records Table */}
                                                <div className={styles.formDetailTableWrap}>
                                                    <table className={styles.clientFormsTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Row ID</th>
                                                                <th>Date</th>
                                                                <th>Program</th>
                                                                <th>STO</th>
                                                                <th>Status</th>
                                                                <th>Employee</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ftForms.map((form: any, idx: number) => (
                                                                <tr key={form.id || idx}>
                                                                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: ftColor }}>{form.rowId || '—'}</span></td>
                                                                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                                                                        {form.date || (form.timestamp ? new Date(form.timestamp).toLocaleDateString() : '—')}
                                                                    </td>
                                                                    <td style={{ fontSize: '12px' }}>{form.program || '—'}</td>
                                                                    <td style={{ fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={form.sto}>{form.sto || '—'}</td>
                                                                    <td>
                                                                        <span style={{
                                                                            display: 'inline-block', padding: '2px 6px', borderRadius: '100px', fontSize: '10px', fontWeight: 700,
                                                                            background: form.status === 'Success' ? 'rgba(52,168,83,0.1)' : 'rgba(239,68,68,0.1)',
                                                                            color: form.status === 'Success' ? 'var(--success)' : '#ef4444',
                                                                        }}>{form.status || '—'}</span>
                                                                    </td>
                                                                    <td style={{ fontSize: '12px' }}>{form.employeeName || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </aside>
                        </>
                    );
                })()}
            </div >

            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingClient(null); // Reset when closing
                }}
                onSave={handleSaveClient}
                initialData={editingClient}
            />
        </div>
    );
}
