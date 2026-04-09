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
import BaselineSheetPrintView from '@/components/forms/BaselineSheetPrintView';
import MassTrialPrintView from '@/components/forms/MassTrialPrintView';
import DailyRoutinesPrintView from '@/components/forms/DailyRoutinesPrintView';
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
    const [draggableCard, setDraggableCard] = useState<CardId | null>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [includeGraph, setIncludeGraph] = useState(true);
    const [printModalData, setPrintModalData] = useState<{ type: string, form: any, aggregate?: boolean } | null>(null);

    // Apply printing-modal class to body when modal is open
    useEffect(() => {
        if (printModalData) {
            document.body.classList.add('printing-modal');
        } else {
            document.body.classList.remove('printing-modal');
        }
        return () => document.body.classList.remove('printing-modal');
    }, [printModalData]);    const toggleCard = (cardId: CardId) =>
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
            dbClient.get('/academic_baselines').catch(() => []),
            dbClient.get('/mass_trials').catch(() => []),
            dbClient.get('/daily_routines').catch(() => []),
            dbClient.get('/transaction-sheets').catch(() => []),
            dbClient.get('/users').catch(() => []),
        ]).then(([clients, mastery, dtt, daily, transaction, users]) => {
            const allClients = Array.isArray(clients) ? clients : [];
            setUsersList(Array.isArray(users) ? users : []);

            // Match by clientId string OR numeric id (for clients created without a clientId field)
            const cleanClientId = clientId.replace(/^CLI-/, '');
            let found = allClients.find((c: any) =>
                c.clientId === clientId || 
                String(c.id) === clientId ||
                String(c.id) === cleanClientId ||
                c.clientId === cleanClientId
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
                draggable={draggableCard === cardId}
                onDragStart={() => handleDragStart(cardId, col)}
                onDragOver={(e) => handleCardOver(e, cardId, col)}
                onDrop={handleDrop}
            >
                <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                        <span 
                            className={styles.dragHandle}
                            onMouseEnter={() => setDraggableCard(cardId)}
                            onMouseLeave={() => setDraggableCard(null)}
                            title="Drag to reorder"
                        >
                            <GripVertical size={14} />
                        </span>
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
                            filterStartDate, setFilterStartDate,
                            filterEndDate, setFilterEndDate,
                            includeGraph, setIncludeGraph,
                            client, setPrintModalData
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

            {/* Print In-Page Modal */}
            {printModalData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', overflowY: 'auto' }}>
                    <div className="print-modal-content" style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '1000px', padding: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div className="no-print" style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 12 }}>
                            <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                Print / Save as PDF
                            </button>
                            <button onClick={() => setPrintModalData(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                                Close
                            </button>
                        </div>
                        
                        <div style={{ marginTop: '20px' }}>
                            {printModalData.type === 'Transaction Sheet' && (
                                <TransactionSheetPrintView sheet={printModalData.form} printOnly={false} />
                            )}
                            {printModalData.type === 'Baseline Sheet' && (
                                <BaselineSheetPrintView sheet={printModalData.form} printOnly={false} includeGraph={includeGraph} />
                            )}
                            {printModalData.type === 'Mass Trial / DTT' && (
                                <MassTrialPrintView sheet={printModalData.form} printOnly={false} includeGraph={includeGraph} />
                            )}
                            {printModalData.type === 'Daily Routines' && (
                                <DailyRoutinesPrintView sheet={printModalData.form} printOnly={false} includeGraph={includeGraph} />
                            )}
                        </div>
                    </div>
                </div>
            )}
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
    filterStartDate, setFilterStartDate,
    filterEndDate, setFilterEndDate,
    includeGraph, setIncludeGraph,
    client, setPrintModalData
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
    filterStartDate: string;
    setFilterStartDate: (v: string) => void;
    filterEndDate: string;
    setFilterEndDate: (v: string) => void;
    includeGraph: boolean;
    setIncludeGraph: (v: boolean) => void;
    client: any;
    setPrintModalData: (data: any) => void;
}) {
    const normalizeDate = (dStr: any) => {
        if (!dStr) return '';
        try {
            const safe = String(dStr).trim();
            if (safe.includes('/')) {
                const parts = safe.split('/');
                if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            } else if (safe.includes('-')) {
                const parts = safe.split('-');
                if (parts.length === 3 && parts[0].length !== 4) {
                     return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
            }
            return safe;
        } catch (err) {
            return '';
        }
    };

    const applyGlobalDateFilter = (sourceForms: any[]) => {
        if (!filterStartDate && !filterEndDate) return sourceForms;

        return sourceForms.map(form => {
            const clone = JSON.parse(JSON.stringify(form));
            // Standard session filtering
            if (Array.isArray(clone.sessions)) {
                clone.sessions = clone.sessions.filter((s: any) => {
                    const d = normalizeDate(s.date);
                    if (!d) return true; // keep if no date
                    if (filterStartDate && d < filterStartDate) return false;
                    if (filterEndDate && d > filterEndDate) return false;
                    return true;
                });
            }
            // Daily Routines items filtering (they contain a date)
            if (Array.isArray(clone.items)) {
                clone.items = clone.items.filter((item: any) => {
                    const d = normalizeDate(item.date);
                    if (!d) return true;
                    if (filterStartDate && d < filterStartDate) return false;
                    if (filterEndDate && d > filterEndDate) return false;
                    return true;
                });
            }
            return clone;
        }).filter(form => {
            // Drop form if ALL sessions or ALL items were filtered out
            if (Array.isArray(form.sessions) && form.sessions.length === 0 && form.formType !== 'Transaction Sheet') return false;
            if (Array.isArray(form.items) && form.items.length === 0) return false;

            // Also filter by root date if applicable
            if (form.date) {
                const d = normalizeDate(form.date);
                if (d) {
                    if (filterStartDate && d < filterStartDate) return false;
                    if (filterEndDate && d > filterEndDate) return false;
                }
            }
            return true;
        });
    };

    const dailyRoutinesForms = applyGlobalDateFilter(forms.filter(f => f.formType === 'Daily Routines'));
    const dailyRoutinesCount = forms.filter(f => f.formType === 'Daily Routines').length;

    const transactionForms = applyGlobalDateFilter(forms.filter(f => f.formType === 'Transaction Sheet'));
    const transactionCount = forms.filter(f => f.formType === 'Transaction Sheet').length; // Keep total un-filtered context for the Tab Counter

    const totalCount = forms.filter(f => f.formType === 'Baseline Sheet' || f.formType === 'Mass Trial / DTT' || f.formType === 'Daily Routines' || f.formType === 'Transaction Sheet').length;
    if (totalCount === 0) return null;

    const baselineForms = applyGlobalDateFilter(forms.filter(f => f.formType === 'Baseline Sheet'));
    const dttForms = applyGlobalDateFilter(forms.filter(f => f.formType === 'Mass Trial / DTT'));
    const dttCount = forms.filter(f => f.formType === 'Mass Trial / DTT').length; // Unfiltered count

    // Pick the first baseline program as default tab
    const currentTab = activeBaselineTab || baselineForms[0]?.program || null;
    const tabSheet = baselineForms.find((f: any) => f.program === currentTab) || baselineForms[0];

    const fmtDate = (d: string) => {
        try {
            const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
            return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return d; }
    };

    const dateFilterUI = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexGrow: 1, justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Filter:</span>
            <input
                type="date"
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 11, cursor: 'pointer', outline: 'none', background: '#f8fafc' }}
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                title="Start Date"
            />
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>to</span>
            <input
                type="date"
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 11, cursor: 'pointer', outline: 'none', background: '#f8fafc' }}
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                title="End Date"
            />
            <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 600, background: '#fff', color: '#64748b', cursor: 'pointer' }}
            >
                Clear
            </button>
            {activeFormTab !== 'Transaction Sheet' && (
                <label style={{ display: 'flex', alignItems: 'center', marginLeft: 16, fontSize: 12, fontWeight: 700, color: '#0f766e', cursor: 'pointer', gap: 6 }}>
                    <input 
                        type="checkbox" 
                        checked={includeGraph} 
                        onChange={e => setIncludeGraph(e.target.checked)} 
                        style={{ cursor: 'pointer', accentColor: '#0f766e', width: 14, height: 14 }} 
                    />
                    Show Graph
                </label>
            )}
        </div>
    );

    const renderTransactionSheetTabView = () => {

        // Note: transactionForms is already deep-filtered by applyGlobalDateFilter,
        // but we want to drop forms entirely if their sessions list became empty.
        const filteredForms = transactionForms.filter((sheet: any) => {
            if (sheet.date) return true; // Keep root-date sheets
            if (Array.isArray(sheet.sessions) && sheet.sessions.length === 0) {
                // If it used to have sessions but they were all filtered out, drop it.
                if (forms.find((f: any) => f.id === sheet.id)?.sessions?.length > 0) {
                    return false; 
                }
            }
            return true;
        });

        const selectedTab = activeTransactionSheetTab && activeTransactionSheetTab !== 'aggregate' ? activeTransactionSheetTab : 'aggregate';
        const displayForm = selectedTab !== 'aggregate' ? filteredForms.find((f: any) => String(f.id) === String(selectedTab)) : null;

        // Aggregate logic
        const allSessions: any[] = [];
        let programStr = '';

        transactionForms.forEach((sheet: any) => {
            if (!programStr && sheet.program) programStr = sheet.program;

            if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
                allSessions.push(...sheet.sessions);
            } else if (sheet.locations || sheet.date) {
                allSessions.push({
                    id: sheet.id || String(Math.random()),
                    date: sheet.date || '',
                    employeeId: sheet.employeeId || '',
                    employeeName: sheet.employeeName || '',
                    cellPhoneLocation: sheet.cellPhoneLocation || '',
                    locations: sheet.locations || []
                });
            }
        });

        allSessions.sort((a, b) => (normalizeDate(a.date) || '').localeCompare(normalizeDate(b.date) || ''));

        const aggregateSheet = {
            clientName: client?.kidsName || client?.name || '',
            program: programStr || 'Multiple Programs',
            sessions: allSessions
        };

        return (
            <div style={{ padding: '16px', background: '#fafbff' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Transactions
                        </div>
                        <select 
                            value={String(selectedTab)}
                            onChange={e => setActiveTransactionSheetTab(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#fff', color: '#334155', fontWeight: 600, minWidth: '220px', cursor: 'pointer' }}
                        >
                            <option value="aggregate">All Sessions (Aggregate)</option>
                            {filteredForms.map((f: any) => {
                                let dateStr = '';
                                if (f.date) dateStr = new Date(normalizeDate(f.date) + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                else if (Array.isArray(f.sessions) && f.sessions.length > 0) {
                                    dateStr = new Date(normalizeDate(f.sessions[f.sessions.length-1].date) + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                }
                                return (
                                    <option key={f.id} value={f.id}>{f.program || 'Form'} {dateStr ? `(${dateStr})` : ''} - #{String(f.id).slice(0, 6)}</option>
                                );
                            })}
                        </select>
                    </div>
                    {dateFilterUI}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {selectedTab !== 'aggregate' && displayForm ? (
                            <button onClick={() => setPrintModalData({ type: 'Transaction Sheet', form: displayForm, aggregate: false })} style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, background: '#ccfbf1', borderRadius: 6, padding: '6px 14px', border: '1px solid #99f6e4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>👁 View</button>
                        ) : (
                            <button onClick={() => setPrintModalData({ type: 'Transaction Sheet', form: aggregateSheet, aggregate: true })} style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, background: '#ccfbf1', borderRadius: 6, padding: '6px 14px', border: '1px solid #99f6e4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>👁 View</button>
                        )}
                    </div>
                </div>

                {selectedTab !== 'aggregate' && displayForm ? (
                    displayForm.sessions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '30px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            No sessions exist in this form for the selected date range.
                        </div>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
                            <TransactionSheetPrintView sheet={displayForm} printOnly={false} />
                        </div>
                    )
                ) : filteredForms.length === 0 || allSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '30px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        No transaction forms found for the selected date range.
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
                        <TransactionSheetPrintView sheet={aggregateSheet} printOnly={false} />
                    </div>
                )}
            </div>
        );
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
                <>
                    {dttCount === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                            No Mass Trial / DTT sheets yet.
                        </div>
                    ) : (
                        <div style={{ padding: '16px', background: '#fafbff' }}>
                            {dttForms.length > 1 && (
                                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Select a form to view:
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {dttForms.map((f: any) => (
                                            <button key={f.id} onClick={() => setActiveDttTab(f.program)} style={{ padding: '6px 14px', borderRadius: 100, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', borderColor: activeDttTab === f.program ? '#6366f1' : '#e2e8f0', background: activeDttTab === f.program ? '#6366f1' : '#fff', color: activeDttTab === f.program ? '#fff' : '#64748b' }}>{f.program}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(() => {
                                const currentDttTab = activeDttTab || dttForms[0]?.program || null;
                                const selectedForm = dttForms.find((f: any) => f.program === currentDttTab) || dttForms[0];
                                if (!selectedForm) return null;
                                return (<>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mass Trial / DTT</span>
                                            <span style={{ background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{selectedForm.program}</span>
                                        </div>
                                        {dateFilterUI}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setPrintModalData({ type: 'Mass Trial / DTT', form: selectedForm })} style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, background: '#ccfbf1', borderRadius: 6, padding: '6px 12px', border: '1px solid #99f6e4', cursor: 'pointer' }}>👁 View</button>
                                        </div>
                                    </div>
                                    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}><MassTrialPrintView sheet={selectedForm} printOnly={false} includeGraph={includeGraph} /></div>
                                </>);
                            })()}
                        </div>
                    )}
                </>
            )}

            {/* ── Baseline Sheet tab view ── */}
            {
                activeFormTab === 'Baseline Sheet' && (
                    <>
                        {baselineForms.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                                No Baseline Sheets yet.
                            </div>
                        ) : (
                            <div style={{ padding: '16px', background: '#fafbff' }}>
                                {baselineForms.length > 1 && (
                                    <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0fdfa', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Select a form to view:
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {baselineForms.map((f: any) => (
                                                <button key={f.id} onClick={() => setActiveBaselineTab(f.program)} style={{ padding: '6px 14px', borderRadius: 100, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', borderColor: activeBaselineTab === f.program ? '#0d9488' : '#e2e8f0', background: activeBaselineTab === f.program ? '#0d9488' : '#fff', color: activeBaselineTab === f.program ? '#fff' : '#64748b' }}>{f.program}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(() => {
                                    const currentTab = activeBaselineTab || baselineForms[0]?.program || null;
                                    const selectedForm = baselineForms.find((f: any) => f.program === currentTab) || baselineForms[0];
                                    if (!selectedForm) return null;
                                    return (<>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Baseline Sheet</span>
                                                <span style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{selectedForm.program}</span>
                                            </div>
                                            {dateFilterUI}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => setPrintModalData({ type: 'Baseline Sheet', form: selectedForm })} style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, background: '#ccfbf1', borderRadius: 6, padding: '6px 12px', border: '1px solid #99f6e4', cursor: 'pointer' }}>👁 View</button>
                                            </div>
                                        </div>
                                        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}><BaselineSheetPrintView sheet={selectedForm} printOnly={false} includeGraph={includeGraph} /></div>
                                    </>);
                                })()}
                            </div>
                        )}
                    </>
                )
            }
            {/* ── Daily Routines tab view ── */}
            {activeFormTab === 'Daily Routines' && (
                <>
                    {dailyRoutinesForms.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                            No Daily Routines forms yet.
                        </div>
                    ) : (
                        <div style={{ padding: '16px', background: '#fafbff' }}>
                            {dailyRoutinesForms.length > 1 && (
                                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Select a form to view:
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {dailyRoutinesForms.map((f: any) => (
                                            <button key={f.id} onClick={() => setActiveDailyRoutinesTab(f.program)} style={{ padding: '6px 14px', borderRadius: 100, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', borderColor: activeDailyRoutinesTab === f.program ? '#10b981' : '#e2e8f0', background: activeDailyRoutinesTab === f.program ? '#10b981' : '#fff', color: activeDailyRoutinesTab === f.program ? '#fff' : '#64748b' }}>{f.program}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(() => {
                                const currentTab = activeDailyRoutinesTab || dailyRoutinesForms[0]?.program || null;
                                const selectedForm = dailyRoutinesForms.find((f: any) => f.program === currentTab) || dailyRoutinesForms[0];
                                if (!selectedForm) return null;
                                return (<>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '10px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Routines</span>
                                            <span style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #6ee7b7', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{selectedForm.program}</span>
                                        </div>
                                        {dateFilterUI}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setPrintModalData({ type: 'Daily Routines', form: selectedForm })} style={{ fontSize: 11, color: '#0f766e', fontWeight: 700, background: '#ccfbf1', borderRadius: 6, padding: '6px 12px', border: '1px solid #99f6e4', cursor: 'pointer' }}>👁 View</button>
                                        </div>
                                    </div>
                                    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}><DailyRoutinesPrintView sheet={selectedForm} printOnly={false} includeGraph={includeGraph} /></div>
                                </>);
                            })()}
                        </div>
                    )}
                </>
            )}
            {/* ── Transaction Sheet tab view ── */}
            {activeFormTab === 'Transaction Sheet' && (
                <>
                    {transactionCount === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 16px' }}>
                            No Transaction Sheets yet.
                        </div>
                    ) : (
                        renderTransactionSheetTabView()
                    )}
                </>
            )}
        </>
    );
}


