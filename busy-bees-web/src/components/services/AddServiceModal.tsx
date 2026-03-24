
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import styles from './AddServiceModal.module.css';
import { dbClient } from '@/lib/dbClient';


const PROVIDER_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const TEXT_COLORS = [
    '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8',
    '#475569', '#1e293b', '#0f172a', '#000000'
];

interface ProviderObj {
    name: string;
    color: string;
    textColor?: string;
}

interface AddServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: any) => void;
    initialData?: { serviceId: string, name: string, provider?: string } | null;
    existingServices?: any[];
}

export default function AddServiceModal({ isOpen, onClose, onSave, initialData, existingServices }: AddServiceModalProps) {
    const [serviceId, setServiceId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Provider state
    const [providers, setProviders] = useState<ProviderObj[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [newProviderName, setNewProviderName] = useState('');
    const [providerBgColor, setProviderBgColor] = useState(PROVIDER_COLORS[0]);
    const [providerTextColor, setProviderTextColor] = useState('#ffffff');

    // Load providers from shared database
    useEffect(() => {
        if (!isOpen) return;
        // Load providers from DB
        dbClient.get('/providers')
            .then((data: ProviderObj[]) => {
                setProviders(data);
                localStorage.setItem('busy_bees_providers', JSON.stringify(data));
            })
            .catch(() => {
                // Fallback to localStorage
                const saved = localStorage.getItem('busy_bees_providers');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        const migrated = parsed.map((p: any) => {
                            if (typeof p === 'string') {
                                let hash = 0;
                                for (let i = 0; i < p.length; i++) hash = p.charCodeAt(i) + ((hash << 5) - hash);
                                return { name: p, color: PROVIDER_COLORS[Math.abs(hash) % PROVIDER_COLORS.length], textColor: '#ffffff' };
                            }
                            return p;
                        });
                        setProviders(migrated);
                    } catch { }
                }
            });
    }, [isOpen]);


    useEffect(() => {
        if (isOpen) {
            setErrorMessage('');
            if (initialData) {
                setServiceId(initialData.serviceId);
                setServiceName(initialData.name);
                setSelectedProvider(initialData.provider || '');
                setNewProviderName('');
            } else {
                // Generate a random ID like SRV-1234
                setServiceId(`SRV - ${Math.floor(1000 + Math.random() * 9000)} `);
                setServiceName('');
                setSelectedProvider('');
                setNewProviderName('');
            }
        }
    }, [isOpen, initialData]);

    // Update colors when a provider is selected
    useEffect(() => {
        if (isOpen && selectedProvider && selectedProvider !== 'ADD_NEW') {
            const pObj = providers.find(p => p.name === selectedProvider);
            if (pObj) {
                setProviderBgColor(pObj.color || PROVIDER_COLORS[0]);
                setProviderTextColor(pObj.textColor || '#ffffff');
            }
        } else if (selectedProvider === 'ADD_NEW') {
            setProviderBgColor(PROVIDER_COLORS[0]);
            setProviderTextColor('#ffffff');
        }
    }, [selectedProvider, providers, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        let finalProvider = selectedProvider;
        if (selectedProvider === 'ADD_NEW' && newProviderName.trim()) {
            finalProvider = newProviderName.trim();
        }

        if (!initialData && existingServices) {
            const providerToMatch = finalProvider !== 'ADD_NEW' ? finalProvider : '';
            const serviceExists = existingServices.some(s =>
                s.name.toLowerCase() === serviceName.trim().toLowerCase() &&
                (s.provider || '') === providerToMatch
            );
            if (serviceExists) {
                setErrorMessage('Service with this name and provider already exists');
                return;
            }
        }

        let updatedProviders = [...providers];

        try {
            if (selectedProvider === 'ADD_NEW' && newProviderName.trim()) {
                // Create new provider in shared DB
                finalProvider = newProviderName.trim();
                const newObj = { name: newProviderName, color: providerBgColor, textColor: providerTextColor };
                const saved = await dbClient.post('/providers', newObj);
                updatedProviders.push(saved);
            } else if (selectedProvider && selectedProvider !== 'ADD_NEW') {
                // Update existing provider colors in shared DB
                const existing = providers.find(p => p.name === selectedProvider) as any;
                if (existing) {
                    const updated = { ...existing, color: providerBgColor, textColor: providerTextColor };
                    await dbClient.patch(`/providers/${existing.id}`, { color: providerBgColor, textColor: providerTextColor });
                    updatedProviders = updatedProviders.map(p => p.name === selectedProvider ? updated : p);
                }
            }
        } catch {
            console.warn('Could not save provider to shared DB — falling back to localStorage only.');
        }

        if (finalProvider) {
            setProviders(updatedProviders);
            localStorage.setItem('busy_bees_providers', JSON.stringify(
                updatedProviders.filter((p: any) => p.name !== 'No default providers')
            ));
        }

        onSave({
            serviceId,
            clientId: 'Unassigned',
            childName: 'Unassigned',
            type: serviceName,
            hours: 'TBD',
            provider: finalProvider !== 'ADD_NEW' ? finalProvider : '',
        });
        onClose();
    };


    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                    <X size={24} />
                </button>

                <h2 className={styles.title}>{initialData ? 'Edit Service' : 'Add New Service'}</h2>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service ID</label>
                        <input
                            type="text"
                            value={serviceId}
                            className={`${styles.input} ${styles.readOnlyInput} `}
                            disabled
                            title="Auto-generated Service ID"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service Name</label>
                        <input
                            type="text"
                            value={serviceName}
                            onChange={(e) => { setServiceName(e.target.value); setErrorMessage(''); }}
                            className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
                            placeholder="e.g. ABA Therapy"
                            required
                        />
                        {errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service Provider</label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className={styles.input}
                            required
                        >
                            <option value="">Select a provider</option>
                            {providers.filter(p => p.name && p.name !== 'No default providers').map((pObj, idx) => (
                                <option key={idx} value={pObj.name}>{pObj.name}</option>
                            ))}
                            <option value="ADD_NEW">+ Add New Provider...</option>
                        </select>
                    </div>

                    {selectedProvider === 'ADD_NEW' && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Provider Name</label>
                            <input
                                type="text"
                                value={newProviderName}
                                onChange={(e) => setNewProviderName(e.target.value)}
                                className={styles.input}
                                placeholder="e.g. Dr. Sarah Jenkins"
                                required={selectedProvider === 'ADD_NEW'}
                            />
                        </div>
                    )}

                    {selectedProvider && (
                        <>
                            <div className={styles.formGroup} style={{ marginTop: '8px' }}>
                                <label className={styles.label}>Pill Background Color</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={providerBgColor}
                                        onChange={(e) => setProviderBgColor(e.target.value)}
                                        style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                                    />
                                    <input
                                        type="text"
                                        value={providerBgColor}
                                        onChange={(e) => setProviderBgColor(e.target.value)}
                                        className={styles.input}
                                        style={{ flex: 1, fontFamily: 'monospace' }}
                                        placeholder="#000000"
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                        title="Hex color code (e.g. #F6F7F8)"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Pill Text Color</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={providerTextColor}
                                        onChange={(e) => setProviderTextColor(e.target.value)}
                                        style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                                    />
                                    <input
                                        type="text"
                                        value={providerTextColor}
                                        onChange={(e) => setProviderTextColor(e.target.value)}
                                        className={styles.input}
                                        style={{ flex: 1, fontFamily: 'monospace' }}
                                        placeholder="#FFFFFF"
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                        title="Hex color code (e.g. #FFFFFF)"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Preview</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span
                                        className={styles.previewBubble}
                                        style={{ backgroundColor: providerBgColor, color: providerTextColor }}
                                    >
                                        {selectedProvider === 'ADD_NEW' ? (newProviderName || 'New Provider') : selectedProvider}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.saveBtn} disabled={!serviceName.trim()}>
                            {initialData ? 'Save Changes' : 'Save Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
