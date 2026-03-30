'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import styles from './AddClientModal.module.css';
import { MOCK_AVAILABLE_SERVICES } from '@/lib/mockData';
import { dbClient } from '@/lib/dbClient';
import Autocomplete from 'react-google-autocomplete';

interface MultiEntry {
    id: string;
    value: string;
    type: string;
    isPrimary: boolean;
}

interface ServiceEntry {
    id: string;
    serviceId: string;
    hours: string;
    providerId?: string;
}

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any; // Add initialData prop
}

const ADDRESS_TYPES = ['Home', 'School', 'Work', 'Other'];
const PHONE_TYPES = ['Mobile', 'Home', 'Work', 'Emergency'];
const EMAIL_TYPES = ['Personal', 'Work', 'School', 'Other'];

// Address Input Component with Google Maps Autocomplete
const AddressInput = ({
    value,
    onChange,
    placeholder,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className: string;
}) => {
    return (
        <Autocomplete
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            onPlaceSelected={(place: any) => {
                if (place && place.formatted_address) {
                    onChange(place.formatted_address);
                } else if (place && place.name) {
                    onChange(place.name);
                }
            }}
            options={{
                types: ['address'],
                componentRestrictions: { country: "us" },
            }}
            defaultValue={value}
            onChange={(e: any) => onChange(e.target.value)}
            className={className}
            placeholder={placeholder}
            style={{ width: '100%' }}
        />
    );
};

export default function AddClientModal({ isOpen, onClose, onSave, initialData }: AddClientModalProps) {
    // Basic Info
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [guardian, setGuardian] = useState('');
    const [guardianLastName, setGuardianLastName] = useState('');
    const [dob, setDob] = useState('');
    const [status, setStatus] = useState('Active');

    // Additional Fields
    const [teacher, setTeacher] = useState('');
    const [clientServices, setClientServices] = useState<ServiceEntry[]>([
        { id: '1', serviceId: '', hours: '0h' }
    ]);
    const [assignedPrograms, setAssignedPrograms] = useState('');
    const [iepMeeting, setIepMeeting] = useState('');
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    // Program Categories
    interface ProgTarget { id: string; name: string; }
    interface ProgCat { id: string; name: string; targets: ProgTarget[]; }
    const [programCategories, setProgramCategories] = useState<ProgCat[]>([]);
    const [showCatForm, setShowCatForm] = useState(false);
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [catNameTags, setCatNameTags] = useState<string[]>([]);
    const [catSubTags, setCatSubTags] = useState<string[]>([]);
    const catNameInputRef = useRef<HTMLInputElement>(null);
    const catSubInputRef = useRef<HTMLInputElement>(null);
    const [catNameInput, setCatNameInput] = useState('');
    const [catSubInput, setCatSubInput] = useState('');

    function addCatNameTag() {
        const v = catNameInput.trim(); if (!v) return;
        setCatNameTags([v]); setCatNameInput('');
    }
    function addCatSubTag() {
        const v = catSubInput.trim(); if (!v || catSubTags.includes(v)) return;
        setCatSubTags(p => [...p, v]); setCatSubInput('');
    }
    function catRandId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
    function openCatAdd() {
        setEditCatId(null); setCatNameTags([]); setCatSubTags([]);
        setCatNameInput(''); setCatSubInput(''); setShowCatForm(true);
    }
    function openCatEdit(cat: ProgCat) {
        setEditCatId(cat.id); setCatNameTags([cat.name]);
        setCatSubTags(cat.targets.map(t => t.name));
        setCatNameInput(''); setCatSubInput(''); setShowCatForm(true);
    }
    function saveCat() {
        // Use committed tag first; fall back to raw input for the category name
        const name = (catNameTags[0] || catNameInput).trim();
        if (!name) return;
        // Collect committed sub-tags plus any text still in the input field
        const pendingSub = catSubInput.trim();
        const allSubs = pendingSub && !catSubTags.includes(pendingSub)
            ? [...catSubTags, pendingSub]
            : catSubTags;
        const targets: ProgTarget[] = allSubs.map(n => ({ id: catRandId(), name: n }));
        if (editCatId) {
            setProgramCategories(p => p.map(c => c.id === editCatId ? { ...c, name, targets } : c));
        } else {
            setProgramCategories(p => [...p, { id: catRandId(), name, targets }]);
        }
        setShowCatForm(false); setEditCatId(null);
        setCatNameTags([]); setCatSubTags([]);
        setCatNameInput(''); setCatSubInput('');
    }
    function deleteCat(id: string) { setProgramCategories(p => p.filter(c => c.id !== id)); }


    useEffect(() => {
        const savedServices = localStorage.getItem('busy_bees_services');
        if (savedServices) {
            try {
                setAvailableServices(JSON.parse(savedServices));
            } catch (e) {
                console.error("Failed to parse available services", e);
                setAvailableServices(MOCK_AVAILABLE_SERVICES);
            }
        } else {
            setAvailableServices(MOCK_AVAILABLE_SERVICES);
        }

        // Fetch users to populate the service provider dropdown
        if (isOpen) {
            dbClient.get('/users').then(data => {
                setUsersList(data);
            }).catch(e => console.error("Could not load users for provider list", e));
        }
    }, [isOpen]);

    // Multi-entry Arrays
    const [addresses, setAddresses] = useState<MultiEntry[]>([
        { id: '1', value: '', type: 'Home', isPrimary: true }
    ]);
    const [phones, setPhones] = useState<MultiEntry[]>([
        { id: '1', value: '', type: 'Mobile', isPrimary: true }
    ]);
    const [emails, setEmails] = useState<MultiEntry[]>([
        { id: '1', value: '', type: 'Personal', isPrimary: true }
    ]);

    // Effect to populate form when initialData changes or modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            // Split name if needed (simple assumption: First Last)
            const nameParts = (initialData.kidsName || '').split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');

            setGuardian(initialData.guardian || '');
            setGuardianLastName(initialData.guardianLastName || '');
            setDob(initialData.dob || '');
            setStatus(initialData.status || 'Active');
            setTeacher(initialData.teacher || '');
            if (initialData.services && Array.isArray(initialData.services)) {
                setClientServices(initialData.services.length > 0 ? initialData.services : [{ id: '1', serviceId: '', hours: '0h', providerId: '' }]);
            } else if (initialData.services && typeof initialData.services === 'string') {
                // Fallback for old string format based on name lookup
                // Complex resolution omitted for brevity, fallback to empty selection
                setClientServices([{ id: '1', serviceId: '', hours: '0h', providerId: '' }]);
            } else {
                setClientServices([{ id: '1', serviceId: '', hours: '0h', providerId: '' }]);
            }
            setAssignedPrograms(initialData.assignedPrograms || '');
            setIepMeeting(initialData.iepMeeting || '');
            setProgramCategories(initialData.programCategories || []);

            // Handle multi-entry fields if they exist in initialData, 
            // otherwise parse from flattened string or default
            // checks if initialData has array, else creates default from string 
            // (Assumes persistence saves array structure, if not, we fallback to parsing or default)
            if (initialData.phones && Array.isArray(initialData.phones)) {
                setPhones(initialData.phones);
            } else if (initialData.phone) {
                setPhones([{ id: Date.now().toString(), value: initialData.phone, type: 'Mobile', isPrimary: true }]);
            } else {
                setPhones([{ id: '1', value: '', type: 'Mobile', isPrimary: true }]);
            }

            if (initialData.emails && Array.isArray(initialData.emails)) {
                setEmails(initialData.emails);
            } else if (initialData.email) {
                setEmails([{ id: Date.now().toString() + '1', value: initialData.email, type: 'Personal', isPrimary: true }]);
            } else {
                setEmails([{ id: '1', value: '', type: 'Personal', isPrimary: true }]);
            }

            if (initialData.addresses && Array.isArray(initialData.addresses)) {
                setAddresses(initialData.addresses);
            } else if (initialData.address) {
                setAddresses([{ id: Date.now().toString() + '2', value: initialData.address, type: 'Home', isPrimary: true }]);
            } else {
                setAddresses([{ id: '1', value: '', type: 'Home', isPrimary: true }]);
            }

        } else if (isOpen && !initialData) {
            // Reset form for "Add New"
            setFirstName('');
            setLastName('');
            setGuardian('');
            setGuardianLastName('');
            setDob('');
            setStatus('Active');
            setTeacher('');
            setClientServices([{ id: '1', serviceId: '', hours: '0h', providerId: '' }]);
            setAssignedPrograms('');
            setIepMeeting('');
            setProgramCategories([]);
            setShowCatForm(false);
            setAddresses([{ id: '1', value: '', type: 'Home', isPrimary: true }]);
            setPhones([{ id: '1', value: '', type: 'Mobile', isPrimary: true }]);
            setEmails([{ id: '1', value: '', type: 'Personal', isPrimary: true }]);
        }
    }, [isOpen, initialData]);

    // Helpers
    const capitalizeWords = (str: string) => {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    };

    const capitalizeFirst = (str: string) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const handleNameChange = (setter: (val: string) => void, value: string) => {
        setter(capitalizeWords(value));
    };

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
        }
        return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    if (!isOpen) return null;

    // Helper functions for multi-entry fields
    const updateEntry = (
        setFunc: React.Dispatch<React.SetStateAction<MultiEntry[]>>,
        id: string,
        field: keyof MultiEntry,
        value: any
    ) => {
        setFunc(prev => prev.map(entry =>
            entry.id === id ? { ...entry, [field]: value } : entry
        ));
    };

    const setPrimary = (
        setFunc: React.Dispatch<React.SetStateAction<MultiEntry[]>>,
        id: string
    ) => {
        setFunc(prev => prev.map(entry => ({
            ...entry,
            isPrimary: entry.id === id
        })));
    };

    const addEntry = (
        setFunc: React.Dispatch<React.SetStateAction<MultiEntry[]>>,
        defaultType: string
    ) => {
        setFunc(prev => [
            ...prev,
            { id: Date.now().toString(), value: '', type: defaultType, isPrimary: false }
        ]);
    };

    const removeEntry = (
        setFunc: React.Dispatch<React.SetStateAction<MultiEntry[]>>,
        id: string
    ) => {
        setFunc(prev => {
            const newValue = prev.filter(entry => entry.id !== id);
            // If we removed the primary, make the first one primary
            if (prev.find(e => e.id === id)?.isPrimary && newValue.length > 0) {
                newValue[0].isPrimary = true;
            }
            return newValue;
        });
    };

    const updateServiceEntry = (id: string, field: keyof ServiceEntry, value: string) => {
        setClientServices(prev => prev.map(entry =>
            entry.id === id ? { ...entry, [field]: value } : entry
        ));
    };

    const addServiceEntry = () => {
        setClientServices(prev => [
            ...prev,
            { id: Date.now().toString(), serviceId: '', hours: '0h', providerId: '' }
        ]);
    };

    const removeServiceEntry = (id: string) => {
        setClientServices(prev => prev.filter(entry => entry.id !== id));
    };

    const renderMultiEntryField = (
        label: string,
        entries: MultiEntry[],
        setEntries: React.Dispatch<React.SetStateAction<MultiEntry[]>>,
        types: string[],
        placeholder: string
    ) => (
        <div className={styles.formGroup}>
            <label className={styles.label}>{label}</label>
            <div className={styles.multiEntryGroup}>
                {entries.map((entry) => (
                    <div key={entry.id} className={styles.entryRow}>
                        {label === 'Addresses' ? (
                            <AddressInput
                                value={entry.value}
                                onChange={(val) => updateEntry(setEntries, entry.id, 'value', val)}
                                placeholder={placeholder}
                                className={styles.input}
                            />
                        ) : (
                            <input
                                type="text"
                                className={styles.input}
                                placeholder={placeholder}
                                value={entry.value}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (label === 'Phone Numbers') {
                                        val = formatPhoneNumber(val);
                                    }
                                    updateEntry(setEntries, entry.id, 'value', val);
                                }}
                                style={{ flex: 1 }}
                            />
                        )}

                        <div className={styles.entryControls}>
                            <select
                                className={styles.select}
                                style={{ width: '110px' }}
                                value={entry.type}
                                onChange={(e) => updateEntry(setEntries, entry.id, 'type', e.target.value)}
                            >
                                {types.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <button
                                className={`${styles.primaryToggle} ${entry.isPrimary ? styles.active : ''}`}
                                onClick={() => setPrimary(setEntries, entry.id)}
                                title={entry.isPrimary ? "Primary Contact" : "Set as Primary"}
                            >
                                {entry.isPrimary && <Check size={14} strokeWidth={3} />}
                            </button>

                            {entries.length > 1 && (
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => removeEntry(setEntries, entry.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <button
                    className={styles.addEntryBtn}
                    onClick={() => addEntry(setEntries, types[0])}
                >
                    <Plus size={14} /> Add {label}
                </button>
            </div>
        </div>
    );

    const renderServiceEntries = () => (
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Assigned Services</label>
            <div className={styles.multiEntryGroup}>
                {clientServices.map((entry) => (
                    <div key={entry.id} className={styles.entryRow}>
                        <select
                            className={styles.select}
                            style={{ flex: 2 }}
                            value={entry.serviceId}
                            onChange={(e) => updateServiceEntry(entry.id, 'serviceId', e.target.value)}
                        >
                            <option value="">Select a service...</option>
                            {availableServices.map(srv => (
                                <option key={srv.serviceId} value={srv.serviceId}>
                                    {srv.name} ({srv.provider || 'Unassigned'})
                                </option>
                            ))}
                        </select>
                        <select
                            className={styles.select}
                            style={{ flex: 1.5 }}
                            value={entry.providerId || ''}
                            onChange={(e) => updateServiceEntry(entry.id, 'providerId', e.target.value)}
                        >
                            <option value="">Select a provider...</option>
                            {usersList.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                </option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '80px', position: 'relative' }}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="12"
                                value={entry.hours.replace(/[^0-9]/g, '')}
                                onChange={(e) => updateServiceEntry(entry.id, 'hours', e.target.value ? `${e.target.value.replace(/[^0-9]/g, '')}h` : '')}
                                style={{ width: '100%', paddingRight: '24px' }}
                            />
                            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary-light)', fontSize: '14px', pointerEvents: 'none', fontWeight: 500 }}>
                                h
                            </span>
                        </div>
                        <div className={styles.entryControls}>
                            {clientServices.length > 1 && (
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => removeServiceEntry(entry.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <button
                    className={styles.addEntryBtn}
                    onClick={addServiceEntry}
                    type="button"
                >
                    <Plus size={14} /> Add Service
                </button>
            </div>
        </div>
    );

    const handleSave = () => {
        const clientData = {
            id: initialData?.clientId,
            firstName,
            lastName,
            guardian,
            guardianLastName,
            dob,
            status,
            teacher,
            services: clientServices.filter(s => s.serviceId.trim() !== ''),
            assignedPrograms,
            programCategories,
            iepMeeting,
            addresses,
            phones,
            emails
        };
        onSave(clientData);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>{initialData ? 'Edit Client' : 'Add New Client'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Basic Information */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Basic Information</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>First Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={firstName}
                                    onChange={(e) => handleNameChange(setFirstName, e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Last Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={lastName}
                                    onChange={(e) => handleNameChange(setLastName, e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Guardian First Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={guardian}
                                    onChange={(e) => handleNameChange(setGuardian, e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Guardian Last Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={guardianLastName}
                                    onChange={(e) => handleNameChange(setGuardianLastName, e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date of Birth</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Status</label>
                                <select
                                    className={styles.select}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Education & Services Information */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Education & Services</h3>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Teacher's Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={teacher}
                                    onChange={(e) => handleNameChange(setTeacher, e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>IEP Meeting Date</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={iepMeeting}
                                    onChange={(e) => setIepMeeting(e.target.value)}
                                />
                            </div>
                            {renderServiceEntries()}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Program Description</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    value={assignedPrograms}
                                    onChange={(e) => setAssignedPrograms(capitalizeFirst(e.target.value))}
                                />
                            </div>

                            {/* Program Categories */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Program Categories</label>

                                {/* Existing categories */}
                                {programCategories.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                        {programCategories.map(cat => (
                                            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', flex: 1 }}>{cat.name}</span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 2 }}>
                                                    {cat.targets.map(t => (
                                                        <span key={t.id} style={{ fontSize: '11px', background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{t.name}</span>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={() => openCatEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button type="button" onClick={() => deleteCat(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Inline add/edit form */}
                                {showCatForm && (
                                    <div style={{ background: '#f8fafc', border: '1.5px solid #c4b5fd', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#64748b' }}>Category Name</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '7px 10px', background: 'white', cursor: 'text' }} onClick={() => catNameInputRef.current?.focus()}>
                                                {catNameTags.map((t, i) => (
                                                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, background: '#ede9fe', color: '#5b21b6', padding: '3px 8px', borderRadius: '100px' }}>
                                                        {t}
                                                        <button type="button" onClick={() => setCatNameTags([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                                                    </span>
                                                ))}
                                                {catNameTags.length === 0 && (
                                                    <input ref={catNameInputRef} value={catNameInput} onChange={e => setCatNameInput(capitalizeFirst(e.target.value))}
                                                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addCatNameTag(); } }}
                                                        onBlur={addCatNameTag} placeholder="e.g. Colors…"
                                                        style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', background: 'transparent', flex: 1, minWidth: '120px' }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#64748b' }}>Sub-categories</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '7px 10px', background: 'white', minHeight: '42px', cursor: 'text' }} onClick={() => catSubInputRef.current?.focus()}>
                                                {catSubTags.map((t, i) => (
                                                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, background: '#ede9fe', color: '#5b21b6', padding: '3px 8px', borderRadius: '100px' }}>
                                                        {t}
                                                        <button type="button" onClick={() => setCatSubTags(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: 0, display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                                                    </span>
                                                ))}
                                                <input ref={catSubInputRef} value={catSubInput} onChange={e => setCatSubInput(capitalizeFirst(e.target.value))}
                                                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addCatSubTag(); } if (e.key === 'Backspace' && catSubInput === '' && catSubTags.length > 0) setCatSubTags(p => p.slice(0, -1)); }}
                                                    onBlur={addCatSubTag} placeholder={catSubTags.length === 0 ? 'Type and press Enter…' : ''}
                                                    style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', background: 'transparent', flex: 1, minWidth: '120px' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="button" onClick={saveCat} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '8px' }}>
                                                <Check size={14} /> {editCatId ? 'Update' : 'Save'}
                                            </button>
                                            <button type="button" onClick={() => { setShowCatForm(false); setEditCatId(null); }} style={{ background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '8px 14px', borderRadius: '8px' }}>Cancel</button>
                                        </div>
                                    </div>
                                )}

                                {/* Add button */}
                                {!showCatForm && (
                                    <button type="button" onClick={openCatAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#6366f1', background: '#f5f3ff', border: '1.5px dashed #c4b5fd', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                        <Plus size={14} /> Add Program Category
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Contact Information</h3>
                        <div className={styles.multiEntryGroup} style={{ gap: '24px' }}>
                            {renderMultiEntryField('Phone Numbers', phones, setPhones, PHONE_TYPES, '555-0123')}
                            {renderMultiEntryField('Email Addresses', emails, setEmails, EMAIL_TYPES, 'user@example.com')}
                            {renderMultiEntryField('Addresses', addresses, setAddresses, ADDRESS_TYPES, '123 Main St, City, State 12345')}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.saveBtn} onClick={handleSave}>{initialData ? 'Save Changes' : 'Create Client'}</button>
                </div>
            </div>
        </div>
    );
}
