'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Pencil, Phone, Mail, MapPin, Clock,
    FileText, BarChart2, BookOpen, Activity,
    ChevronRight, ChevronDown, ChevronUp, User, CheckCircle, XCircle, GripVertical, X
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import styles from './page.module.css';
import { MOCK_AVAILABLE_SERVICES } from '@/lib/mockData';
import AddClientModal from '@/components/clients/AddClientModal';
import TransactionSheetPrintView from '@/components/forms/TransactionSheetPrintView';
import { dbClient } from '@/lib/dbClient';


function getInitials(name: string) {
    const parts = (name || '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (parts[0]?.[0] || '?').toUpperCase();
}

function calculateAge(dob: string) {
    if (!dob) return '—';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// Card definitions — order is persisted in state
const ALL_CARDS = ['contact', 'personal', 'education', 'program', 'services', 'forms'] as const;
type CardId = typeof ALL_CARDS[number];

const CARD_TITLES: Record<CardId, string> = {
    contact: 'Contact Information',
    personal: 'Personal Details',
    education: 'Education',
    program: 'Program',
    services: 'Services',
    forms: 'Forms',
};

export default function ClientDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = decodeURIComponent(params.id as string);

    const [client, setClient] = useState<any>(null);
    const [forms, setForms] = useState<any[]>([]);
    const [activeFormTab, setActiveFormTab] = useState<'Baseline Sheet' | 'Mass Trial / DTT' | 'Daily Routines' | 'Transaction Sheet'>('Baseline Sheet');
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [usersList, setUsersList] = useState<any[]>([]);

    // Two explicit columns — any number of cards per column
    const [leftCards, setLeftCards] = useState<CardId[]>(['contact', 'personal', 'education', 'program']);
    const [rightCards, setRightCards] = useState<CardId[]>(['services', 'forms']);

    const [baselineExpanded, setBaselineExpanded] = useState(false);
    const [dttExpanded, setDttExpanded] = useState(false);
    const [dailyRoutinesExpanded, setDailyRoutinesExpanded] = useState(false);
    const [transactionSheetExpanded, setTransactionSheetExpanded] = useState(false);
    const [activeBaselineTab, setActiveBaselineTab] = useState<string | null>(null);
    const [activeDttTab, setActiveDttTab] = useState<string | null>(null);
    const [activeDailyRoutinesTab, setActiveDailyRoutinesTab] = useState<string | null>(null);
    const [activeTransactionSheetTab, setActiveTransactionSheetTab] = useState<string | null>(null);
    const [collapsedCards, setCollapsedCards] = useState<Partial<Record<CardId, boolean>>>({});
    const [hiddenStoLines, setHiddenStoLines] = useState<Set<string>>(new Set());

    const toggleCard = (cardId: CardId) =>
        setCollapsedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));

    const toggleStoLine = (name: string) =>
        setHiddenStoLines(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });

    // Drag-and-drop refs
    const dragCard = useRef<CardId | null>(null);
    const dragFromCol = useRef<'left' | 'right' | null>(null);
    const dragOverCard = useRef<CardId | null>(null);
    const dragOverCol = useRef<'left' | 'right' | null>(null);

    const handleDragStart = (card: CardId, col: 'left' | 'right') => {
        dragCard.current = card;
        dragFromCol.current = col;
    };

    // Use onDragOver (fires continuously) instead of onDragEnter (fires once, can be missed)
    const handleCardOver = (e: React.DragEvent, card: CardId, col: 'left' | 'right') => {
        e.preventDefault();
        dragOverCard.current = card;
        dragOverCol.current = col;
    };

    const handleColOver = (e: React.DragEvent, col: 'left' | 'right') => {
        e.preventDefault();
        dragOverCol.current = col;
        // Note: don't reset dragOverCard here — card-level precision is preserved
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const from = dragCard.current;
        const toCard = dragOverCard.current;
        const toCol = dragOverCol.current;
        // Reset all refs
        dragCard.current = null; dragFromCol.current = null;
        dragOverCard.current = null; dragOverCol.current = null;

        if (!from || !toCol) return;

        // Remove the dragged card from whichever column it's in
        let newLeft = leftCards.filter(c => c !== from);
        let newRight = rightCards.filter(c => c !== from);

        // Insert into target column
        const targetArr = toCol === 'left' ? newLeft : newRight;
        if (toCard && targetArr.includes(toCard)) {
            targetArr.splice(targetArr.indexOf(toCard), 0, from);
        } else {
            targetArr.push(from); // dropped on empty column space → append
        }

        setLeftCards([...newLeft]);
        setRightCards([...newRight]);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            dbClient.get('/clients').catch(() => []),
            dbClient.get('/program_mastery').catch(() => []),
            dbClient.get('/mass_trials').catch(() => []),
            dbClient.get('/daily_routines').catch(() => []),
            dbClient.get('/transaction-sheets').catch(() => []),
            dbClient.get('/users').catch(() => []),
        ]).then(([clients, mastery, dtt, daily, transaction, users]) => {
            const allClients = Array.isArray(clients) ? clients : [];
            setUsersList(Array.isArray(users) ? users : []);

            // Match by clientId string OR numeric id (for clients created without a clientId field)
            let found = allClients.find((c: any) =>
                c.clientId === clientId || String(c.id) === clientId
            ) || null;

            // Defensive: parse programCategories if stored as JSON string
            if (found && typeof found.programCategories === 'string') {
                try { found = { ...found, programCategories: JSON.parse(found.programCategories) }; }
                catch { found = { ...found, programCategories: [] }; }
            }
            if (found && !Array.isArray(found.programCategories)) {
                found = { ...found, programCategories: [] };
            }

            setClient(found);

            if (found) {
                const cid = found.clientId || `CLI-${found.id}`;
                const matchesClient = (r: any) =>
                    r.clientId === cid ||
                    r.clientId === String(found!.id) ||
                    r.clientName === found!.kidsName ||
                    r.clientName === found!.name;
                const mapped = [
                    ...(Array.isArray(mastery) ? mastery : []).filter(matchesClient).map((r: any) => ({ ...r, formType: 'Baseline Sheet' })),
                    ...(Array.isArray(dtt) ? dtt : []).filter(matchesClient).map((r: any) => ({ ...r, formType: 'Mass Trial / DTT' })),
                    ...(Array.isArray(daily) ? daily : []).filter(matchesClient).map((r: any) => ({ ...r, formType: 'Daily Routines' })),
                    ...(Array.isArray(transaction) ? transaction : []).filter(matchesClient).map((r: any) => ({ ...r, formType: 'Transaction Sheet' })),
                ].sort((a, b) => (b.date || b.createdAt || b.timestamp || '').localeCompare(a.date || a.createdAt || a.timestamp || ''));
                setForms(mapped);
            }
        }).finally(() => setLoading(false));
    }, [clientId]);



    const handleSaveClient = async (data: any) => {
        try {
            if (client?.id) {
                await dbClient.patch(`/clients/${client.id}`, data);
            } else {
                await dbClient.post('/clients', data);
            }
            setClient({ ...client, ...data });
        } catch (e) {
            console.error('Failed to save client', e);
        }
        setIsEditModalOpen(false);
    };

    const getServiceName = (serviceId: string) => {
        const s = MOCK_AVAILABLE_SERVICES.find(x => x.serviceId === serviceId);
        return s?.name || serviceId;
    };

    const getProviderName = (serviceId: string) => {
        const s = MOCK_AVAILABLE_SERVICES.find(x => x.serviceId === serviceId);
        return s?.provider || 'Busy Bees';
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>Loading client dashboard…</p>
            </div>
        );
    }

    if (!client) {
        return (
            <div className={styles.loadingContainer}>
                <p style={{ color: '#ef4444', fontWeight: 600 }}>Client not found: {clientId}</p>
                <Link href="/clients" className={styles.backBtn}>← Back to Clients</Link>
            </div>
        );
    }

    const age = calculateAge(client.dob);
    const clientServices: any[] = Array.isArray(client.services) ? client.services : [];
    const activeFormForms = forms.filter(f => f.formType === activeFormTab);

    const buckets: Record<string, { Success: number; Failed: number }> = {};
    activeFormForms.forEach(f => {
        const d = f.date || (f.timestamp ? new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown');
        if (!buckets[d]) buckets[d] = { Success: 0, Failed: 0 };
        if (f.status === 'Success') buckets[d].Success++;
        else buckets[d].Failed++;
    });
    const chartData = Object.entries(buckets).slice(-10).map(([date, v]) => ({ date, ...v }));
    const masteryCount = forms.filter(f => f.formType === 'Baseline Sheet').length;

    // Render a card by its ID
    const renderCard = (cardId: CardId, col: 'left' | 'right') => {
        const isCollapsed = !!collapsedCards[cardId];
        return (
            <div
                key={cardId}
                className={styles.card}
                draggable
                onDragStart={() => handleDragStart(cardId, col)}
                onDragOver={(e) => handleCardOver(e, cardId, col)}
                onDrop={handleDrop}
            >
                <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                        <span className={styles.dragHandle}><GripVertical size={14} /></span>
                        {cardId === 'contact' && <Mail size={14} className={styles.cardIcon} />}
                        {cardId === 'personal' && <User size={14} className={styles.cardIcon} />}
                        {cardId === 'education' && <BookOpen size={14} className={styles.cardIcon} />}
                        {cardId === 'program' && <BarChart2 size={14} className={styles.cardIcon} />}
                        {cardId === 'services' && <Activity size={14} className={styles.cardIcon} />}
                        {cardId === 'forms' && <FileText size={14} className={styles.cardIcon} />}
                        {CARD_TITLES[cardId]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cardId === 'services' && (
                            <span className={styles.cardBadge}>{clientServices.length}</span>
                        )}
                        <button
                            onClick={() => toggleCard(cardId)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '2px 4px', borderRadius: 6, color: '#94a3b8',
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                            title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </div>
                {!isCollapsed && (
                    <div className={cardId === 'services' || cardId === 'forms' ? styles.cardBodyNoPad : styles.cardBody}>
                        {cardId === 'contact' && renderContact()}
                        {cardId === 'personal' && renderPersonal(age)}
                        {cardId === 'education' && renderEducation()}
                        {cardId === 'program' && renderProgram()}
                        {cardId === 'services' && renderServices(clientServices, getProviderName, getServiceName)}
                        {cardId === 'forms' && renderForms({
                            forms, activeFormForms, masteryCount, styles,
                            activeFormTab, setActiveFormTab,
                            baselineExpanded, setBaselineExpanded,
                            dttExpanded, setDttExpanded,
                            dailyRoutinesExpanded, setDailyRoutinesExpanded,
                            transactionSheetExpanded, setTransactionSheetExpanded,
                            activeBaselineTab, setActiveBaselineTab,
                            activeDttTab, setActiveDttTab,
                            activeDailyRoutinesTab, setActiveDailyRoutinesTab,
                            activeTransactionSheetTab, setActiveTransactionSheetTab,
                            hiddenStoLines, toggleStoLine,
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderContact = () => (
        <>
            {Array.isArray(client.emails) && client.emails.length > 0 && (
                <div className={styles.contactGroup}>
                    <div className={styles.contactGroupLabel}>Email</div>
                    {[...client.emails].sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((e: any) => (
                        <div key={e.id} className={styles.contactRow}>
                            {e.isPrimary ? <span className={styles.primaryDot}>P</span> : <span className={styles.primaryDotEmpty} />}
                            <span className={styles.contactValue}>{e.value}</span>
                            <span className={styles.contactType}>{e.type}</span>
                            {e.isPrimary && <a href={`mailto:${e.value}`} className={styles.contactAction}><Mail size={13} /></a>}
                        </div>
                    ))}
                </div>
            )}
            {Array.isArray(client.phones) && client.phones.length > 0 && (
                <div className={styles.contactGroup}>
                    <div className={styles.contactGroupLabel}>Phone</div>
                    {[...client.phones].sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((p: any) => (
                        <div key={p.id} className={styles.contactRow}>
                            {p.isPrimary ? <span className={styles.primaryDot}>P</span> : <span className={styles.primaryDotEmpty} />}
                            <span className={styles.contactValue}>{p.value}</span>
                            <span className={styles.contactType}>{p.type}</span>
                            {p.isPrimary && <a href={`tel:${p.value}`} className={styles.contactAction}><Phone size={13} /></a>}
                        </div>
                    ))}
                </div>
            )}
            {Array.isArray(client.addresses) && client.addresses.length > 0 && (
                <div className={styles.contactGroup}>
                    <div className={styles.contactGroupLabel}>Address</div>
                    {[...client.addresses].sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((a: any) => (
                        <div key={a.id} className={styles.contactRow}>
                            {a.isPrimary ? <span className={styles.primaryDot}>P</span> : <span className={styles.primaryDotEmpty} />}
                            <span className={styles.contactValue}>{a.value}</span>
                            <span className={styles.contactType}>{a.type}</span>
                            {a.isPrimary && <a href={`https://maps.google.com/?q=${encodeURIComponent(a.value)}`} target="_blank" rel="noreferrer" className={styles.contactAction}><MapPin size={13} /></a>}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderPersonal = (age: string | number) => (
        <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date of Birth</span>
                <span className={styles.detailValue}>{client.dob || '—'}</span>
            </div>
            <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Age</span>
                <span className={styles.detailValue}>{age}</span>
            </div>
        </div>
    );

    const renderEducation = () => (
        <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Teacher</span>
                <span className={styles.detailValue}>{client.teacher || '—'}</span>
            </div>
            <div className={styles.detailItem}>
                <span className={styles.detailLabel}>IEP Meeting</span>
                <span className={styles.detailValue}>{client.iepMeeting || '—'}</span>
            </div>
        </div>
    );

    const renderProgram = () => (
        <>
            <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Program Description</span>
                    <span className={styles.detailValue}>{client.assignedPrograms || '—'}</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Program %</span>
                    <span className={styles.detailValue}>{client.programPercentage || '—'}</span>
                </div>
            </div>
            {Array.isArray(client.programCategories) && client.programCategories.length > 0 && (
                <div className={styles.programCatsSection}>
                    <div className={styles.detailLabel} style={{ marginBottom: '8px' }}>Program Categories</div>
                    <div className={styles.programCatsList}>
                        {client.programCategories.map((cat: any) => (
                            <div key={cat.id} className={styles.programCatCard}>
                                <div className={styles.programCatName}>{cat.name}</div>
                                {Array.isArray(cat.targets) && cat.targets.length > 0 && (
                                    <div className={styles.programCatTargets}>
                                        {cat.targets.map((t: any) => (
                                            <span key={t.id} className={styles.programCatTarget}>{t.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );

    const renderServices = (
        clientServices: any[],
        getProviderName: (id: string) => string,
        getServiceName: (id: string) => string
    ) => (
        clientServices.length === 0 ? (
            <p className={styles.emptyText}>No services assigned.</p>
        ) : (
            <table className={styles.servicesTable}>
                <thead>
                    <tr>
                        <th>Assigned Provider</th>
                        <th>Service</th>
                        <th>Hours</th>
                        <th>Used</th>
                        <th>Remaining</th>
                    </tr>
                </thead>
                <tbody>
                    {clientServices.map((srv: any, i: number) => (
                        <tr key={i}>
                            <td>
                                <span className={styles.providerChip}>
                                    {(() => {
                                        const user = usersList.find((u: any) => u.id === srv.providerId);
                                        return user ? `${user.firstName} ${user.lastName}` : getProviderName(srv.serviceId);
                                    })()}
                                </span>
                            </td>
                            <td className={styles.srvName}>{getServiceName(srv.serviceId)}</td>
                            <td><span className={styles.hoursBadge}><Clock size={12} /> {srv.hours}</span></td>
                            <td className={styles.usedCell}>0h</td>
                            <td className={styles.remainingCell}>{srv.hours}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    );

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ArrowLeft size={17} />
                        <span>Clients</span>
                    </button>
                    <ChevronRight size={15} className={styles.breadcrumbSep} />
                    <span className={styles.breadcrumbCurrent}>{client.kidsName}</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={`${styles.statusBadge} ${client.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                        {client.status}
                    </span>
                    <button className={styles.editBtn} onClick={() => setIsEditModalOpen(true)}>
                        <Pencil size={14} />
                        Edit Client
                    </button>
                </div>
            </div>

            {/* ── Hero Card ── */}
            <div className={styles.heroCard}>
                <div className={styles.heroAvatar}>
                    {getInitials(client.kidsName)}
                </div>

                <div className={styles.heroInfo}>
                    <div className={styles.heroMeta}>
                        <div className={styles.heroMetaItem}>
                            <span className={styles.heroMetaLabel}>Child Name</span>
                            <h1 className={styles.heroName}>{client.kidsName}</h1>
                        </div>
                        <div className={styles.heroMetaDivider} />
                        <div className={styles.heroMetaItem}>
                            <span className={styles.heroMetaLabel}>Guardian</span>
                            <span className={styles.heroGuardian}>{client.guardian} {client.guardianLastName}</span>
                        </div>
                        <div className={styles.heroMetaDivider} />
                        <div className={styles.heroMetaItem}>
                            <span className={styles.heroMetaLabel}>Client ID</span>
                            <span className={styles.heroClientId}>{client.clientId}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.heroStats}>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{age}</span>
                        <span className={styles.heroStatLabel}>Age</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{clientServices.length}</span>
                        <span className={styles.heroStatLabel}>Services</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{masteryCount}</span>
                        <span className={styles.heroStatLabel}>Baselines</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue}>{masteryCount}</span>
                        <span className={styles.heroStatLabel}>Mastery</span>
                    </div>
                </div>
            </div>

            {/* ── Drag hint ── */}
            <div className={styles.dragHint}>
                <GripVertical size={13} /> Drag cards to any position in either column
            </div>

            {/* ── Main content grid ── */}
            <div className={styles.contentGrid}>
                {/* LEFT COLUMN */}
                <div
                    className={styles.leftCol}
                    onDragOver={(e) => handleColOver(e, 'left')}
                    onDrop={handleDrop}
                >
                    {leftCards.map(id => renderCard(id, 'left'))}
                </div>
                {/* RIGHT COLUMN */}
                <div
                    className={styles.rightCol}
                    onDragOver={(e) => handleColOver(e, 'right')}
                    onDrop={handleDrop}
                >
                    {rightCards.map(id => renderCard(id, 'right'))}
                </div>
            </div>

            {/* Edit Client Modal */}
            <AddClientModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveClient}
                initialData={client}
            />
        </div>
    );
}

// ── Forms card renderer (extracted for clarity) ──────────────────────────────
function renderForms({
    forms, activeFormForms, masteryCount, styles,
    activeFormTab, setActiveFormTab,
    baselineExpanded, setBaselineExpanded,
    dttExpanded, setDttExpanded,
    dailyRoutinesExpanded, setDailyRoutinesExpanded,
    transactionSheetExpanded, setTransactionSheetExpanded,
    activeBaselineTab, setActiveBaselineTab,
    activeDttTab, setActiveDttTab,
    activeDailyRoutinesTab, setActiveDailyRoutinesTab,
    activeTransactionSheetTab, setActiveTransactionSheetTab,
    hiddenStoLines, toggleStoLine,
}: {
    forms: any[];
    activeFormForms: any[];
    masteryCount: number;
    styles: any;
    activeFormTab: 'Baseline Sheet' | 'Mass Trial / DTT' | 'Daily Routines' | 'Transaction Sheet';
    setActiveFormTab: (v: 'Baseline Sheet' | 'Mass Trial / DTT' | 'Daily Routines' | 'Transaction Sheet') => void;
    baselineExpanded: boolean;
    setBaselineExpanded: (v: boolean) => void;
    dttExpanded: boolean;
    setDttExpanded: (v: boolean) => void;
    dailyRoutinesExpanded: boolean;
    setDailyRoutinesExpanded: (v: boolean) => void;
    transactionSheetExpanded: boolean;
    setTransactionSheetExpanded: (v: boolean) => void;
    activeBaselineTab: string | null;
    setActiveBaselineTab: (v: string | null) => void;
    activeDttTab: string | null;
    setActiveDttTab: (v: string | null) => void;
    activeDailyRoutinesTab: string | null;
    setActiveDailyRoutinesTab: (v: string | null) => void;
    activeTransactionSheetTab: string | null;
    setActiveTransactionSheetTab: (v: string | null) => void;
    hiddenStoLines: Set<string>;
    toggleStoLine: (name: string) => void;
}) {
    const dailyRoutinesForms = forms.filter(f => f.formType === 'Daily Routines');
    const dailyRoutinesCount = dailyRoutinesForms.length;
    
    const transactionForms = forms.filter(f => f.formType === 'Transaction Sheet');
    const transactionCount = transactionForms.length;

    const totalCount = forms.filter(f => f.formType === 'Baseline Sheet' || f.formType === 'Mass Trial / DTT' || f.formType === 'Daily Routines' || f.formType === 'Transaction Sheet').length;
    if (totalCount === 0) return null;

    const dttForms = forms.filter(f => f.formType === 'Mass Trial / DTT');
    const dttCount = dttForms.length;

    // Pick the first baseline program as default tab
    const currentTab = activeBaselineTab || activeFormForms[0]?.program || null;
    const tabSheet = activeFormForms.find((f: any) => f.program === currentTab) || activeFormForms[0];

    const fmtDate = (d: string) => {
        try {
            const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
            return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return d; }
    };

    return (
        <>
            {/* ── Tab switcher header ── */}
            <div className={styles.formTabs}>
                <button
                    className={`${styles.formTab} ${activeFormTab === 'Baseline Sheet' ? styles.formTabActive : ''}`}
                    style={activeFormTab === 'Baseline Sheet' ? { borderColor: '#d97706', color: '#d97706', background: '#fffbeb' } : {}}
                    onClick={() => setActiveFormTab('Baseline Sheet')}
                >
                    🏆 Baseline Sheet
                    <span className={styles.formTabBadge} style={{ background: '#fffbeb', color: '#d97706' }}>{masteryCount}</span>
                </button>
                <button
                    className={`${styles.formTab} ${activeFormTab === 'Mass Trial / DTT' ? styles.formTabActive : ''}`}
                    style={activeFormTab === 'Mass Trial / DTT' ? { borderColor: '#6366f1', color: '#6366f1', background: '#eef2ff' } : {}}
                    onClick={() => setActiveFormTab('Mass Trial / DTT')}
                >
                    📊 Mass Trial / DTT
                    <span className={styles.formTabBadge} style={{ background: '#eef2ff', color: '#6366f1' }}>{dttCount}</span>
                </button>
                <button
                    className={`${styles.formTab} ${activeFormTab === 'Daily Routines' ? styles.formTabActive : ''}`}
                    style={activeFormTab === 'Daily Routines' ? { borderColor: '#10b981', color: '#10b981', background: '#ecfdf5' } : {}}
                    onClick={() => setActiveFormTab('Daily Routines')}
                >
                    📅 Daily Routines
                    <span className={styles.formTabBadge} style={{ background: '#ecfdf5', color: '#10b981' }}>{dailyRoutinesCount}</span>
                </button>
                <button
                    className={`${styles.formTab} ${activeFormTab === 'Transaction Sheet' ? styles.formTabActive : ''}`}
                    style={activeFormTab === 'Transaction Sheet' ? { borderColor: '#8b5cf6', color: '#8b5cf6', background: '#f5f3ff' } : {}}
                    onClick={() => setActiveFormTab('Transaction Sheet')}
                >
                    📝 Transaction Sheet
                    <span className={styles.formTabBadge} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>{transactionCount}</span>
                </button>
            </div>

            {/* ── DTT tab view ── */}
            {activeFormTab === 'Mass Trial / DTT' && (
                <div>
                    {dttCount === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                            No Mass Trial / DTT sheets yet.
                        </div>
                    ) : (() => {
                        const currentDttTab = activeDttTab || dttForms[0]?.program || null;
                        const dttSheet = dttForms.find((f: any) => f.program === currentDttTab) || dttForms[0];
                        const dttRows: any[] = Array.isArray(dttSheet?.rows) ? dttSheet.rows : [];
                        const dttSessions: any[] = Array.isArray(dttSheet?.sessions) ? dttSheet.sessions : [];
                        return (
                            <>
                                {true && (() => {
                                    const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
                                    const fmtShort = (d: string) => {
                                        try {
                                            const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
                                            return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        } catch { return d; }
                                    };
                                    const fmtFull = (d: string) => {
                                        try {
                                            const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
                                            return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        } catch { return d; }
                                    };

                                    const dttChartData = dttSessions.map((sess: any, si: number) => {
                                        const pt: any = {
                                            name: `Day ${sess.day ?? si + 1}`,
                                            date: fmtShort(sess.date),
                                            employee: sess.employeeName || '—',
                                        };
                                        dttRows.forEach((row: any, ri: number) => {
                                            const trials: string[] = sess.results?.[String(ri)] || [];
                                            const counted = trials.filter((v: string) => v === '+' || v === '-');
                                            const pct = counted.length > 0 ? Math.round(counted.filter((v: string) => v === '+').length / counted.length * 100) : null;
                                            pt[row.step] = pct;
                                        });
                                        return pt;
                                    });

                                    const DttXTick = ({ x, y, payload }: any) => {
                                        const d = dttChartData[payload.index];
                                        if (!d) return null;
                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={0} y={0} dy={14} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>{d.name}</text>
                                                <text x={0} y={0} dy={26} textAnchor="middle" fill="#94a3b8" fontSize={9}>{d.date}</text>
                                                <text x={0} y={0} dy={38} textAnchor="middle" fill="#64748b" fontSize={9}>{d.employee}</text>
                                            </g>
                                        );
                                    };
                                    const PctYTick = ({ x, y, payload }: any) => (
                                        <g transform={`translate(${x},${y})`}>
                                            <text x={-4} y={0} dy={4} textAnchor="end" fontSize={10} fill="#94a3b8" fontWeight={600}>{payload.value}%</text>
                                        </g>
                                    );

                                    const thStyle: React.CSSProperties = {
                                        padding: '10px', borderRight: '1px solid #f1f5f9',
                                        textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap',
                                        fontSize: 10, fontWeight: 700, color: '#94a3b8',
                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                        background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0',
                                    };
                                    const cellStyle: React.CSSProperties = {
                                        padding: '8px 10px', borderRight: '1px solid #f1f5f9',
                                        textAlign: 'center', verticalAlign: 'middle',
                                    };

                                    return (
                                        <div style={{ borderTop: '1.5px solid #c7d2fe' }}>
                                            {/* Sub-program tabs */}
                                            {dttForms.length > 1 && (
                                                <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexWrap: 'wrap', background: '#eef2ff' }}>
                                                    {dttForms.map((f: any) => (
                                                        <button key={f.id} onClick={() => setActiveDttTab(f.program)}
                                                            style={{
                                                                padding: '5px 14px', borderRadius: 100, border: '1.5px solid',
                                                                cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                                                                borderColor: currentDttTab === f.program ? '#6366f1' : '#e2e8f0',
                                                                background: currentDttTab === f.program ? '#6366f1' : '#f8fafc',
                                                                color: currentDttTab === f.program ? '#fff' : '#64748b',
                                                            }}>{f.program}</button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Sub-header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Mass Trial / DTT</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 100, padding: '1px 10px' }}>{dttSheet.program}</span>
                                                </div>
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{dttSessions.length} session{dttSessions.length !== 1 ? 's' : ''} recorded</span>
                                            </div>

                                            {/* Chart */}
                                            {dttSessions.length > 0 && dttRows.length > 0 && (
                                                <div style={{ padding: '4px 16px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
                                                        % Correct Over Time
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 10 }}>
                                                        Each line shows one STO's % correct per session · click legend to show/hide
                                                    </div>
                                                    <ResponsiveContainer width="100%" height={240}>
                                                        <LineChart data={dttChartData} margin={{ top: 8, right: 24, left: 12, bottom: 50 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                            <XAxis dataKey="name" tick={<DttXTick />} axisLine={false} tickLine={false} height={52} />
                                                            <YAxis tick={<PctYTick />} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={44} />
                                                            <Tooltip
                                                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                                                                itemStyle={{ fontWeight: 600 }}
                                                                formatter={(value: any, name: any) => [
                                                                    value !== null ? `${value}%` : '— Not recorded', name
                                                                ]}
                                                                labelFormatter={(label: any) => {
                                                                    const d = dttChartData.find((c: any) => c.name === label);
                                                                    return d ? `${d.name} · ${d.date} · ${d.employee}` : label;
                                                                }}
                                                            />
                                                            <Legend
                                                                iconType="circle"
                                                                iconSize={8}
                                                                wrapperStyle={{ fontSize: 11, paddingTop: 6, cursor: 'pointer' }}
                                                                onClick={(payload: any) => toggleStoLine(payload.value)}
                                                                formatter={(value: any) => (
                                                                    <span style={{ opacity: hiddenStoLines.has(value) ? 0.35 : 1, textDecoration: hiddenStoLines.has(value) ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                                                                        {value}
                                                                    </span>
                                                                )}
                                                            />
                                                            {dttRows.map((row: any, ri: number) => (
                                                                <Line key={row.step} type="monotone" dataKey={row.step} name={row.step}
                                                                    stroke={COLORS[ri % COLORS.length]} strokeWidth={2.5}
                                                                    dot={{ r: 5, fill: COLORS[ri % COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                                                                    activeDot={{ r: 7 }} connectNulls={false}
                                                                    hide={hiddenStoLines.has(row.step)}
                                                                />
                                                            ))}
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}

                                            {/* Full detail table */}
                                            {dttRows.length > 0 && (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ ...thStyle, width: 32 }}>#</th>
                                                                <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>STO</th>
                                                                {dttSessions.map((sess: any, si: number) => {
                                                                    let sPlus = 0, sTotal = 0;
                                                                    dttRows.forEach((_: any, ri: number) => {
                                                                        const t: string[] = sess.results?.[String(ri)] || [];
                                                                        t.forEach((v: string) => { if (v === '+' || v === '-') { sTotal++; if (v === '+') sPlus++; } });
                                                                    });
                                                                    const sPct = sTotal > 0 ? Math.round(sPlus / sTotal * 100) : null;
                                                                    return (
                                                                        <th key={si} style={{ ...thStyle, minWidth: 100 }}>
                                                                            <div style={{ fontWeight: 800, color: '#334155', fontSize: 11 }}>DAY {sess.day ?? si + 1}</div>
                                                                            <div style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{fmtFull(sess.date)}</div>
                                                                            <div style={{ fontWeight: 500, color: '#64748b', fontSize: 10 }}>{sess.employeeName}</div>
                                                                            <a href={`/forms/mass-trial/${dttSheet.id}`} onClick={e => e.stopPropagation()}
                                                                                style={{ display: 'inline-block', marginTop: 3, fontSize: 10, color: '#6366f1', fontWeight: 700, textDecoration: 'none', background: '#eef2ff', borderRadius: 4, padding: '1px 6px', border: '1px solid #c7d2fe' }}>
                                                                                ✏ Edit</a>
                                                                        </th>
                                                                    );
                                                                })}
                                                                <th style={{ ...thStyle, minWidth: 80, textAlign: 'right', paddingRight: 16 }}>AVG %</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dttRows.map((row: any, ri: number) => {
                                                                let rPlus = 0, rTotal = 0;
                                                                dttSessions.forEach((s: any) => {
                                                                    const t: string[] = s.results?.[String(ri)] || [];
                                                                    t.forEach((v: string) => { if (v === '+' || v === '-') { rTotal++; if (v === '+') rPlus++; } });
                                                                });
                                                                const rPct = rTotal > 0 ? Math.round(rPlus / rTotal * 100) : null;
                                                                return (
                                                                    <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                        <td style={{ ...cellStyle, color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>{ri + 1}</td>
                                                                        <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600, color: '#1e293b' }}>{row.step}</td>
                                                                        {dttSessions.map((s: any) => {
                                                                            const t: string[] = s.results?.[String(ri)] || [];
                                                                            const counted = t.filter((v: string) => v === '+' || v === '-');
                                                                            const pct = counted.length > 0 ? Math.round(counted.filter((v: string) => v === '+').length / counted.length * 100) : null;
                                                                            return (
                                                                                <td key={s.day} style={cellStyle}>
                                                                                    {pct !== null ? (
                                                                                        <span style={{
                                                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                                            minWidth: 36, padding: '2px 6px', borderRadius: 6,
                                                                                            fontSize: 11, fontWeight: 700,
                                                                                            color: pct >= 80 ? '#15803d' : pct >= 60 ? '#92400e' : '#dc2626',
                                                                                            background: pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#fffbeb' : '#fef2f2',
                                                                                            border: `1.5px solid ${pct >= 80 ? '#86efac' : pct >= 60 ? '#fde68a' : '#fca5a5'}`,
                                                                                        }}>{pct}%</span>
                                                                                    ) : <span style={{ color: '#cbd5e1', fontSize: 16 }}>—</span>}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16 }}>
                                                                            {rPct !== null ? (
                                                                                <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1' }}>
                                                                                    {rPct}%
                                                                                </span>
                                                                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {/* Per-day totals footer */}
                                                            <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                                                <td style={{ ...cellStyle, color: '#6366f1', fontWeight: 700, fontSize: 11 }} colSpan={2}>Σ Total per day</td>
                                                                {dttSessions.map((sess: any, si: number) => {
                                                                    let sPlus = 0, sTotal = 0;
                                                                    dttRows.forEach((_: any, ri: number) => {
                                                                        const t: string[] = sess.results?.[String(ri)] || [];
                                                                        t.forEach((v: string) => { if (v === '+' || v === '-') { sTotal++; if (v === '+') sPlus++; } });
                                                                    });
                                                                    const sPct = sTotal > 0 ? Math.round(sPlus / sTotal * 100) : null;
                                                                    return (
                                                                        <td key={si} style={{ ...cellStyle, fontSize: 11 }}>
                                                                            <span style={{ color: '#15803d', fontWeight: 700 }}>✓{sPlus}</span>
                                                                            <span style={{ color: '#94a3b8', margin: '0 3px' }}>·</span>
                                                                            <span style={{ color: '#dc2626', fontWeight: 700 }}>✗{sTotal - sPlus}</span>
                                                                            {sPct !== null && <span style={{ marginLeft: 4, color: '#64748b', fontWeight: 600 }}>{sPct}%</span>}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16 }}>
                                                                    {(() => {
                                                                        let gPlus = 0, gTotal = 0;
                                                                        dttSessions.forEach((s: any) => dttRows.forEach((_: any, ri: number) => {
                                                                            const t: string[] = s.results?.[String(ri)] || [];
                                                                            t.forEach((v: string) => { if (v === '+' || v === '-') { gTotal++; if (v === '+') gPlus++; } });
                                                                        }));
                                                                        const gPct = gTotal > 0 ? Math.round(gPlus / gTotal * 100) : null;
                                                                        return gPct !== null ? <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1' }}>{gPct}%</span> : null;
                                                                    })()}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    {/* Bottom summary */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                                                        <span>{dttRows.length} STO{dttRows.length !== 1 ? 's' : ''}</span>
                                                        {(() => {
                                                            let gPlus = 0, gTotal = 0;
                                                            dttSessions.forEach((s: any) => dttRows.forEach((_: any, ri: number) => {
                                                                const t: string[] = s.results?.[String(ri)] || [];
                                                                t.forEach((v: string) => { if (v === '+' || v === '-') { gTotal++; if (v === '+') gPlus++; } });
                                                            }));
                                                            const gPct = gTotal > 0 ? Math.round(gPlus / gTotal * 100) : null;
                                                            return (<>
                                                                <span style={{ color: '#15803d' }}>✓{gPlus} Pass</span>
                                                                <span style={{ color: '#dc2626' }}>✗{gTotal - gPlus} Fail</span>
                                                                {gPct !== null && <span style={{ color: '#6366f1', fontWeight: 800 }}>{gPct}% overall</span>}
                                                            </>);
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* ── Baseline Sheet tab view ── */}
            {
                activeFormTab === 'Baseline Sheet' && (
                    <>
                        {/* ── Inline expanded matrix view with tabs ── */}
                        {true && (
                            <div style={{ borderTop: '1.5px solid #ffe082' }}>
                                {/* Program category tabs */}
                                {activeFormForms.length > 1 && (
                                    <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexWrap: 'wrap', background: '#fffde7' }}>
                                        {activeFormForms.map((f: any) => (
                                            <button
                                                key={f.id}
                                                onClick={() => setActiveBaselineTab(f.program)}
                                                style={{
                                                    padding: '5px 14px', borderRadius: 100, border: '1.5px solid',
                                                    cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                                                    borderColor: currentTab === f.program ? '#d97706' : '#e2e8f0',
                                                    background: currentTab === f.program ? '#d97706' : '#f8fafc',
                                                    color: currentTab === f.program ? '#fff' : '#64748b',
                                                }}
                                            >
                                                {f.program}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Spreadsheet matrix */}
                                {tabSheet && (() => {
                                    const rows: any[] = Array.isArray(tabSheet.rows) ? tabSheet.rows : [];
                                    const sessions: any[] = Array.isArray(tabSheet.sessions) ? tabSheet.sessions : [];
                                    const totalPass = sessions.reduce((n: number, s: any) =>
                                        n + rows.filter((_: any, ri: number) => s.results?.[String(ri)] === 'pass').length, 0);
                                    const totalFail = sessions.reduce((n: number, s: any) =>
                                        n + rows.filter((_: any, ri: number) => s.results?.[String(ri)] === 'fail').length, 0);

                                    // CellIcon component — inline for simplicity
                                    const CellIcon = ({ v }: { v: string | undefined }) => {
                                        if (v === 'pass') return (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: '#f0fdf4', border: '1.5px solid #86efac',
                                                color: '#15803d', fontSize: 13, fontWeight: 700,
                                            }}>✓</span>
                                        );
                                        if (v === 'fail') return (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: '#fef2f2', border: '1.5px solid #fca5a5',
                                                color: '#dc2626', fontSize: 13, fontWeight: 700,
                                            }}>✗</span>
                                        );
                                        return <span style={{ color: '#cbd5e1', fontSize: 16 }}>—</span>;
                                    };

                                    const cellStyle: React.CSSProperties = {
                                        padding: '8px 10px', borderRight: '1px solid #f1f5f9',
                                        textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap',
                                    };
                                    const thStyle: React.CSSProperties = {
                                        ...cellStyle, fontSize: 10, fontWeight: 700, color: '#94a3b8',
                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                        background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '10px',
                                    };

                                    return (
                                        <div style={{ overflowX: 'auto', padding: '12px 0 0' }}>
                                            {/* Sub-header: program chip + session count */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0 16px 10px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 800, color: '#92400e',
                                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                                    }}>Baseline Sheet</span>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 700, background: '#fffbeb',
                                                        color: '#d97706', border: '1px solid #ffe082',
                                                        borderRadius: 100, padding: '1px 10px',
                                                    }}>{tabSheet.program}</span>
                                                </div>
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
                                                </span>
                                            </div>

                                            {/* Multi-line STO progress chart — shown at top */}
                                            {sessions.length > 0 && rows.length > 0 && (() => {
                                                const fmtShort = (d: string) => {
                                                    try {
                                                        const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
                                                        return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                    } catch { return d; }
                                                };
                                                const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
                                                const chartData = sessions.map((sess: any, si: number) => {
                                                    const pt: any = {
                                                        name: `Day ${sess.day ?? si + 1}`,
                                                        date: fmtShort(sess.date),
                                                        employee: sess.employeeName || '—',
                                                    };
                                                    rows.forEach((row: any, ri: number) => {
                                                        const v = sess.results?.[String(ri)];
                                                        pt[row.step] = v === 'pass' ? 1 : v === 'fail' ? 0 : null;
                                                    });
                                                    return pt;
                                                });
                                                const DayXTick = ({ x, y, payload }: any) => {
                                                    const d = chartData[payload.index];
                                                    if (!d) return null;
                                                    return (
                                                        <g transform={`translate(${x},${y})`}>
                                                            <text x={0} y={0} dy={14} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>{d.name}</text>
                                                            <text x={0} y={0} dy={26} textAnchor="middle" fill="#94a3b8" fontSize={9}>{d.date}</text>
                                                            <text x={0} y={0} dy={38} textAnchor="middle" fill="#64748b" fontSize={9}>{d.employee}</text>
                                                        </g>
                                                    );
                                                };
                                                const PassFailTick = ({ x, y, payload }: any) => (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <text x={-4} y={0} dy={4} textAnchor="end" fontSize={10}
                                                            fill={payload.value === 1 ? '#10b981' : payload.value === 0 ? '#ef4444' : '#94a3b8'}
                                                            fontWeight={700}>
                                                            {payload.value === 1 ? 'Pass' : payload.value === 0 ? 'Fail' : ''}
                                                        </text>
                                                    </g>
                                                );
                                                return (
                                                    <div style={{ padding: '12px 16px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                                            STO Progress Over Time
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 12 }}>
                                                            Each line shows one STO's pass/fail result per session
                                                        </div>
                                                        <ResponsiveContainer width="100%" height={240}>
                                                            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 12, bottom: 50 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                                <XAxis dataKey="name" tick={<DayXTick />} axisLine={false} tickLine={false} height={52} />
                                                                <YAxis tick={<PassFailTick />} axisLine={false} tickLine={false} domain={[-0.1, 1.1]} ticks={[0, 1]} width={44} />
                                                                <Tooltip
                                                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                                                                    itemStyle={{ fontWeight: 600 }}
                                                                    formatter={(value: any, name: any) => [
                                                                        value === 1 ? '✓ Pass' : value === 0 ? '✗ Fail' : '— Not recorded', name
                                                                    ]}
                                                                    labelFormatter={(label: any) => {
                                                                        const d = chartData.find((c: any) => c.name === label);
                                                                        return d ? `${d.name} · ${d.date} · ${d.employee}` : label;
                                                                    }}
                                                                />
                                                                <Legend
                                                                    iconType="circle"
                                                                    iconSize={8}
                                                                    wrapperStyle={{ fontSize: 11, paddingTop: 6, cursor: 'pointer' }}
                                                                    onClick={(payload: any) => toggleStoLine(payload.value)}
                                                                    formatter={(value: any) => (
                                                                        <span style={{ opacity: hiddenStoLines.has(value) ? 0.35 : 1, textDecoration: hiddenStoLines.has(value) ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                                                                            {value}
                                                                        </span>
                                                                    )}
                                                                />
                                                                {rows.map((row: any, ri: number) => (
                                                                    <Line key={row.step} type="monotone" dataKey={row.step} name={row.step}
                                                                        stroke={COLORS[ri % COLORS.length]} strokeWidth={2.5}
                                                                        dot={{ r: 5, fill: COLORS[ri % COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                                                                        activeDot={{ r: 7 }} connectNulls={false}
                                                                        hide={hiddenStoLines.has(row.step)}
                                                                    />
                                                                ))}
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                );
                                            })()}

                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...thStyle, width: 32, textAlign: 'center' }}>#</th>
                                                        <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>STO</th>
                                                        {sessions.map((sess: any, si: number) => {
                                                            const sPass = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'pass').length;
                                                            const sFail = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'fail').length;
                                                            const sTotal = sPass + sFail;
                                                            const sPct = sTotal > 0 ? Math.round(sPass / sTotal * 100) : null;
                                                            return (
                                                                <th key={si} style={{ ...thStyle, minWidth: 100 }}>
                                                                    <div style={{ fontWeight: 800, color: '#334155', fontSize: 11 }}>
                                                                        DAY {sess.day ?? si + 1}
                                                                    </div>
                                                                    <div style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
                                                                        {fmtDate(sess.date)}
                                                                    </div>
                                                                    <div style={{ fontWeight: 500, color: '#64748b', fontSize: 10 }}>
                                                                        {sess.employeeName}
                                                                    </div>
                                                                    <a
                                                                        href={`/forms/baseline-sheet/${tabSheet.id}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        style={{
                                                                            display: 'inline-block', marginTop: 3,
                                                                            fontSize: 10, color: '#d97706', fontWeight: 700,
                                                                            textDecoration: 'none',
                                                                            background: '#fffbeb', borderRadius: 4, padding: '1px 6px',
                                                                            border: '1px solid #ffe082',
                                                                        }}
                                                                    >✏ Edit</a>
                                                                </th>
                                                            );
                                                        })}
                                                        <th style={{ ...thStyle, minWidth: 120, textAlign: 'right', paddingRight: 16 }}>
                                                            PASS / FAIL
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row: any, ri: number) => {
                                                        const rPass = sessions.filter((s: any) => s.results?.[String(ri)] === 'pass').length;
                                                        const rFail = sessions.filter((s: any) => s.results?.[String(ri)] === 'fail').length;
                                                        const rTotal = rPass + rFail;
                                                        const rPct = rTotal > 0 ? Math.round(rPass / rTotal * 100) : null;
                                                        return (
                                                            <tr key={ri} style={{ background: ri % 2 === 1 ? '#fafbff' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ ...cellStyle, color: '#94a3b8', fontWeight: 600 }}>{ri + 1}</td>
                                                                <td style={{ ...cellStyle, textAlign: 'left', color: '#334155', fontWeight: 600, paddingLeft: 14 }}>
                                                                    {row.step}
                                                                </td>
                                                                {sessions.map((sess: any, si: number) => (
                                                                    <td key={si} style={cellStyle}>
                                                                        <CellIcon v={sess.results?.[String(ri)]} />
                                                                    </td>
                                                                ))}
                                                                <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16 }}>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
                                                                        <span style={{ color: '#15803d' }}>✓{rPass} Pass</span>
                                                                        <span style={{ color: '#94a3b8' }}>×</span>
                                                                        <span style={{ color: '#dc2626' }}>{rFail} Fail</span>
                                                                        {rPct !== null && <span style={{ color: '#6366f1' }}>· {rPct}%</span>}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}

                                                    {/* Totals row */}
                                                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                                                        <td style={{ ...cellStyle, color: '#64748b', fontSize: 11, paddingLeft: 14 }} colSpan={2}>
                                                            Σ Total per day
                                                        </td>
                                                        {sessions.map((sess: any, si: number) => {
                                                            const sPass = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'pass').length;
                                                            const sFail = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'fail').length;
                                                            const sTotal = sPass + sFail;
                                                            const sPct = sTotal > 0 ? Math.round(sPass / sTotal * 100) : null;
                                                            return (
                                                                <td key={si} style={{ ...cellStyle, fontSize: 11 }}>
                                                                    <span style={{ color: '#15803d' }}>✓{sPass}</span>
                                                                    {' · '}
                                                                    <span style={{ color: '#dc2626' }}>✗{sFail}</span>
                                                                    {sPct !== null && <span style={{ color: '#6366f1' }}> {sPct}%</span>}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16, fontSize: 11 }}>
                                                            <span style={{ color: '#15803d' }}>✓{totalPass}</span>
                                                            {' · '}
                                                            <span style={{ color: '#dc2626' }}>✗{totalFail}</span>
                                                            {totalPass + totalFail > 0 && (
                                                                <span style={{ color: '#6366f1' }}> {Math.round(totalPass / (totalPass + totalFail) * 100)}%</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* Bottom summary */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                gap: 14, padding: '10px 16px', borderTop: '1px solid #f1f5f9',
                                                fontSize: 12, fontWeight: 600, color: '#64748b',
                                            }}>
                                                <span>{rows.length} STO{rows.length !== 1 ? 's' : ''}</span>
                                                <span style={{ color: '#15803d' }}>✓{totalPass} Pass</span>
                                                <span style={{ color: '#dc2626' }}>× {totalFail} Fail</span>
                                            </div>


                                        </div>
                                    );
                                })()}
                            </div >
                        )
                        }
                    </>
                )
            }

            {/* ── Daily Routines tab view ── */}
            {
                activeFormTab === 'Daily Routines' && (
                    <>
                        {/* ── Inline expanded matrix view with tabs ── */}
                        {true && (() => {
                            const currentDailyTab = activeDailyRoutinesTab || activeFormForms[0]?.program || null;
                            const dailyTabSheet = activeFormForms.find((f: any) => f.program === currentDailyTab) || activeFormForms[0];

                            return (
                                <div style={{ borderTop: '1.5px solid #6ee7b7' }}>
                                    {/* Program category tabs */}
                                    {activeFormForms.length > 1 && (
                                        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexWrap: 'wrap', background: '#ecfdf5' }}>
                                            {activeFormForms.map((f: any) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setActiveDailyRoutinesTab(f.program)}
                                                    style={{
                                                        padding: '5px 14px', borderRadius: 100, border: '1.5px solid',
                                                        cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                                                        borderColor: currentDailyTab === f.program ? '#10b981' : '#e2e8f0',
                                                        background: currentDailyTab === f.program ? '#10b981' : '#f8fafc',
                                                        color: currentDailyTab === f.program ? '#fff' : '#64748b',
                                                    }}
                                                >
                                                    {f.program}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Spreadsheet matrix */}
                                    {dailyTabSheet && (() => {
                                        const rows: any[] = Array.isArray(dailyTabSheet.rows) ? dailyTabSheet.rows : [];
                                        const sessions: any[] = Array.isArray(dailyTabSheet.sessions) ? dailyTabSheet.sessions : [];
                                        const totalPass = sessions.reduce((n: number, s: any) =>
                                            n + rows.filter((_: any, ri: number) => s.results?.[String(ri)] === 'pass').length, 0);
                                        const totalFail = sessions.reduce((n: number, s: any) =>
                                            n + rows.filter((_: any, ri: number) => s.results?.[String(ri)] === 'fail').length, 0);

                                        const CellIcon = ({ v }: { v: string | undefined }) => {
                                            if (v === 'pass') return (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: '#f0fdf4', border: '1.5px solid #86efac',
                                                    color: '#15803d', fontSize: 13, fontWeight: 700,
                                                }}>✓</span>
                                            );
                                            if (v === 'fail') return (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: '#fef2f2', border: '1.5px solid #fca5a5',
                                                    color: '#dc2626', fontSize: 13, fontWeight: 700,
                                                }}>✗</span>
                                            );
                                            return <span style={{ color: '#cbd5e1', fontSize: 16 }}>—</span>;
                                        };

                                        const cellStyle: React.CSSProperties = {
                                            padding: '8px 10px', borderRight: '1px solid #f1f5f9',
                                            textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap',
                                        };
                                        const thStyle: React.CSSProperties = {
                                            ...cellStyle, fontSize: 10, fontWeight: 700, color: '#94a3b8',
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                            background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '10px',
                                        };

                                        const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#84cc16'];

                                        const fmtShort = (d: string) => {
                                            try {
                                                const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
                                                return new Date(safe).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                                            } catch { return d; }
                                        };

                                        const chartData = sessions.map((sess: any, si: number) => {
                                            const pt: any = {
                                                name: `Day ${sess.day ?? si + 1}`,
                                                date: fmtShort(sess.date),
                                                employee: sess.employeeName || '—',
                                            };
                                            rows.forEach((row: any, ri: number) => {
                                                const v = sess.results?.[String(ri)];
                                                pt[row.step] = v === 'pass' ? 1 : v === 'fail' ? 0 : null;
                                            });
                                            return pt;
                                        });

                                        const DayXTick = ({ x, y, payload }: any) => {
                                            const d = chartData[payload.index];
                                            if (!d) return null;
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text x={0} y={0} dy={14} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={700}>{d.name}</text>
                                                    <text x={0} y={0} dy={26} textAnchor="middle" fill="#94a3b8" fontSize={9}>{d.date}</text>
                                                    <text x={0} y={0} dy={38} textAnchor="middle" fill="#64748b" fontSize={9}>{d.employee}</text>
                                                </g>
                                            );
                                        };

                                        const PassFailTick = ({ x, y, payload }: any) => (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={-4} y={0} dy={4} textAnchor="end" fontSize={10}
                                                    fill={payload.value === 1 ? '#10b981' : payload.value === 0 ? '#ef4444' : '#94a3b8'}
                                                    fontWeight={700}>
                                                    {payload.value === 1 ? 'Pass' : payload.value === 0 ? 'Fail' : ''}
                                                </text>
                                            </g>
                                        );

                                        return (
                                            <div style={{ overflowX: 'auto', padding: '12px 0 0' }}>
                                                {/* Sub-header: program chip + session count */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', padding: '0 16px 10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>Daily Routines</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#10b981', border: '1px solid #6ee7b7', borderRadius: 100, padding: '1px 10px' }}>{dailyTabSheet.program}</span>
                                                    </div>
                                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</span>
                                                </div>

                                                {sessions.length > 0 && rows.length > 0 && (
                                                    <div style={{ padding: '0px 16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                                            Routine Progress Over Time
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 12 }}>
                                                            Each line shows one Step's pass/fail result per session · click legend to show/hide
                                                        </div>
                                                        <ResponsiveContainer width="100%" height={240}>
                                                            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 12, bottom: 50 }}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                                <XAxis dataKey="name" tick={<DayXTick />} axisLine={false} tickLine={false} height={52} />
                                                                <YAxis tick={<PassFailTick />} axisLine={false} tickLine={false} domain={[-0.1, 1.1]} ticks={[0, 1]} width={44} />
                                                                <Tooltip
                                                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                                                                    itemStyle={{ fontWeight: 600 }}
                                                                    formatter={(value: any, name: any) => [
                                                                        value === 1 ? '✓ Pass' : value === 0 ? '✗ Fail' : '— Not recorded', name
                                                                    ]}
                                                                    labelFormatter={(label: any) => {
                                                                        const d = chartData.find((c: any) => c.name === label);
                                                                        return d ? `${d.name} · ${d.date} · ${d.employee}` : label;
                                                                    }}
                                                                />
                                                                <Legend
                                                                    iconType="circle"
                                                                    iconSize={8}
                                                                    wrapperStyle={{ fontSize: 11, paddingTop: 6, cursor: 'pointer' }}
                                                                    onClick={(payload: any) => toggleStoLine(payload.value)}
                                                                    formatter={(value: any) => (
                                                                        <span style={{ opacity: hiddenStoLines.has(value) ? 0.35 : 1, textDecoration: hiddenStoLines.has(value) ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                                                                            {value}
                                                                        </span>
                                                                    )}
                                                                />
                                                                {rows.map((row: any, ri: number) => (
                                                                    <Line key={row.step} type="monotone" dataKey={row.step} name={row.step}
                                                                        stroke={COLORS[ri % COLORS.length]} strokeWidth={2.5}
                                                                        dot={{ r: 5, fill: COLORS[ri % COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                                                                        activeDot={{ r: 7 }} connectNulls={false}
                                                                        hide={hiddenStoLines.has(row.step)}
                                                                    />
                                                                ))}
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}

                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ ...thStyle, width: 32, textAlign: 'center' }}>#</th>
                                                            <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>STEP</th>
                                                            {sessions.map((sess: any, si: number) => {
                                                                const sPass = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'pass').length;
                                                                const sFail = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'fail').length;
                                                                const sTotal = sPass + sFail;
                                                                const sPct = sTotal > 0 ? Math.round(sPass / sTotal * 100) : null;
                                                                return (
                                                                    <th key={si} style={{ ...thStyle, minWidth: 100 }}>
                                                                        <div style={{ fontWeight: 800, color: '#334155', fontSize: 11 }}>DAY {sess.day ?? si + 1}</div>
                                                                        <div style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
                                                                            {new Date(sess.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </div>
                                                                        <div style={{ fontWeight: 500, color: '#64748b', fontSize: 10 }}>{sess.employeeName}</div>
                                                                        <a href={`/forms/daily-routines/${dailyTabSheet.id}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-block', marginTop: 3, fontSize: 10, color: '#10b981', fontWeight: 700, textDecoration: 'none', background: '#ecfdf5', borderRadius: 4, padding: '1px 6px', border: '1px solid #6ee7b7' }}>✏ Edit</a>
                                                                    </th>
                                                                );
                                                            })}
                                                            <th style={{ ...thStyle, minWidth: 120, textAlign: 'right', paddingRight: 16 }}>PASS / FAIL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row: any, ri: number) => {
                                                            const rPass = sessions.filter((s: any) => s.results?.[String(ri)] === 'pass').length;
                                                            const rFail = sessions.filter((s: any) => s.results?.[String(ri)] === 'fail').length;
                                                            const rTotal = rPass + rFail;
                                                            const rPct = rTotal > 0 ? Math.round(rPass / rTotal * 100) : null;
                                                            return (
                                                                <tr key={ri} style={{ background: ri % 2 === 1 ? '#fafbff' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ ...cellStyle, color: '#94a3b8', fontWeight: 600 }}>{ri + 1}</td>
                                                                    <td style={{ ...cellStyle, textAlign: 'left', color: '#334155', fontWeight: 600, paddingLeft: 14 }}>{row.step}</td>
                                                                    {sessions.map((sess: any, si: number) => (
                                                                        <td key={si} style={cellStyle}><CellIcon v={sess.results?.[String(ri)]} /></td>
                                                                    ))}
                                                                    <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16 }}>
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
                                                                            <span style={{ color: '#15803d' }}>✓{rPass} Pass</span>
                                                                            <span style={{ color: '#94a3b8' }}>×</span>
                                                                            <span style={{ color: '#dc2626' }}>{rFail} Fail</span>
                                                                            {rPct !== null && <span style={{ color: '#6366f1' }}>· {rPct}%</span>}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {/* Totals row */}
                                                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                                                            <td style={{ ...cellStyle, color: '#64748b', fontSize: 11, paddingLeft: 14 }} colSpan={2}>Σ Total per day</td>
                                                            {sessions.map((sess: any, si: number) => {
                                                                const sPass = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'pass').length;
                                                                const sFail = rows.filter((_: any, ri: number) => sess.results?.[String(ri)] === 'fail').length;
                                                                const sTotal = sPass + sFail;
                                                                const sPct = sTotal > 0 ? Math.round(sPass / sTotal * 100) : null;
                                                                return (
                                                                    <td key={si} style={{ ...cellStyle, fontSize: 11 }}>
                                                                        <span style={{ color: '#15803d' }}>✓{sPass}</span>{' · '}
                                                                        <span style={{ color: '#dc2626' }}>✗{sFail}</span>
                                                                        {sPct !== null && <span style={{ color: '#6366f1' }}> {sPct}%</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ ...cellStyle, textAlign: 'right', paddingRight: 16, fontSize: 11 }}>
                                                                <span style={{ color: '#15803d' }}>✓{totalPass}</span>{' · '}
                                                                <span style={{ color: '#dc2626' }}>✗{totalFail}</span>
                                                                {totalPass + totalFail > 0 && <span style={{ color: '#6366f1' }}> {Math.round(totalPass / (totalPass + totalFail) * 100)}%</span>}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>

                                                {/* Bottom summary */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                                                    <span>{rows.length} STEP{rows.length !== 1 ? 's' : ''}</span>
                                                    <span style={{ color: '#15803d' }}>✓{totalPass} Pass</span>
                                                    <span style={{ color: '#dc2626' }}>× {totalFail} Fail</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()}
                    </>
                )
            }

            {/* ── Transaction Sheet tab view ── */}
            {
                activeFormTab === 'Transaction Sheet' && (
                    <>
                        {true && (
                            <div style={{ borderTop: '1.5px solid #ddd6fe', padding: '16px 0 0' }}>
                                {transactionCount === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                                        No Transaction Sheets yet.
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ padding: '10px 16px', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Date</th>
                                                <th style={{ padding: '10px 16px', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Program</th>
                                                <th style={{ padding: '10px 16px', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Employee</th>
                                                <th style={{ padding: '10px 16px', borderBottom: '1.5px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Locations Logged</th>
                                                <th style={{ padding: '10px 16px', borderBottom: '1.5px solid #e2e8f0', textAlign: 'right', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionForms.map((f: any, i: number) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafbff' : '#fff' }}>
                                                    <td style={{ padding: '10px 16px', color: '#334155', fontWeight: 600 }}>
                                                        {fmtDate(f.date)}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500 }}>
                                                        <span style={{ background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{f.program || 'N/A'}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500 }}>{f.employeeName}</td>
                                                    <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: '#334155' }}>{(f.locations || []).length}</span> locations
                                                    </td>
                                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                                        <button onClick={e => { e.stopPropagation(); window.open(`/forms/transaction-sheet/${f.id}/view`, '_blank'); }} style={{ display: 'inline-block', fontSize: 11, color: '#0891b2', fontWeight: 700, background: '#ecfeff', borderRadius: 4, padding: '3px 8px', border: '1px solid #cffafe', marginRight: 6, cursor: 'pointer' }}>
                                                            👁 View
                                                        </button>
                                                        <a href={`/forms/transaction-sheet/${f.id}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-block', fontSize: 11, color: '#8b5cf6', fontWeight: 700, textDecoration: 'none', background: '#f5f3ff', borderRadius: 4, padding: '3px 8px', border: '1px solid #ddd6fe' }}>
                                                            ✏ Edit
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={5} style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                                    Total: {transactionCount} recorded sheet(s)
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        )}
                    </>
                )
            }
        </>
    );
}


