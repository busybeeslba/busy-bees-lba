'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Filter, ArrowUpDown } from 'lucide-react';
import AddServiceModal from '@/components/services/AddServiceModal';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import FacetedFilter from '@/components/ui/FacetedFilter';
import styles from '../page.module.css';
import { MOCK_AVAILABLE_SERVICES } from '@/lib/mockData';
import { dbClient } from '@/lib/dbClient';


export default function ServiceListPage() {
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);

    // Advanced Filter State
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Load services and providers from shared database on mount
    useEffect(() => {
        dbClient.get('/available_services')
            .then((data: any[]) => {
                setAvailableServices(data);
                localStorage.setItem('busy_bees_services', JSON.stringify(data));
            })
            .catch(() => {
                const saved = localStorage.getItem('busy_bees_services');
                setAvailableServices(saved ? JSON.parse(saved) : MOCK_AVAILABLE_SERVICES);
            });

        dbClient.get('/providers')
            .then((data: any[]) => {
                setProviders(data);
                localStorage.setItem('busy_bees_providers', JSON.stringify(data));
            })
            .catch(() => {
                const savedProviders = localStorage.getItem('busy_bees_providers');
                if (savedProviders) {
                    try { setProviders(JSON.parse(savedProviders)); } catch { }
                }
            });
    }, []);

    const handleSaveService = async (newService: any) => {
        try {
            if (editingService) {
                // PATCH existing
                const payload = { name: newService.type, provider: newService.provider };
                const saved = await dbClient.patch(`/available_services/${editingService.id || editingService.serviceId}`, payload);
                const updated = availableServices.map(s =>
                    s.serviceId === editingService.serviceId ? { ...s, ...saved } : s
                );
                setAvailableServices(updated);
                localStorage.setItem('busy_bees_services', JSON.stringify(updated));
            } else {
                // POST new
                const payload = { id: newService.serviceId, serviceId: newService.serviceId, name: newService.type, provider: newService.provider };
                const saved = await dbClient.post('/available_services', payload);
                const updated = [saved, ...availableServices];
                setAvailableServices(updated);
                localStorage.setItem('busy_bees_services', JSON.stringify(updated));
            }
        } catch {
            alert('Could not save service — is the shared database running on port 3011?');
        }
        setEditingService(null);

        const savedProviders = localStorage.getItem('busy_bees_providers');
        if (savedProviders) {
            try { setProviders(JSON.parse(savedProviders)); } catch { }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            await dbClient.delete(`/available_services/${id}`);
            const updated = availableServices.filter(s => s.serviceId !== id);
            setAvailableServices(updated);
            localStorage.setItem('busy_bees_services', JSON.stringify(updated));
        } catch {
            alert('Could not delete service — is the shared database running on port 3011?');
        }
    };


    const getProviderStyle = (providerName: string) => {
        if (!providerName || providerName === 'Unassigned') return { backgroundColor: '#94a3b8', color: '#ffffff' };

        const pObj = providers.find(p => p.name === providerName);
        if (pObj && pObj.color) {
            return { backgroundColor: pObj.color, color: pObj.textColor || '#ffffff' };
        }

        let hash = 0;
        for (let i = 0; i < providerName.length; i++) hash = providerName.charCodeAt(i) + ((hash << 5) - hash);
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
        return { backgroundColor: colors[Math.abs(hash) % colors.length], color: '#ffffff' };
    };

    // Apply Advanced Filters
    let filteredServices = useDataFilter({
        data: availableServices,
        rules: filterRules,
        matchType
    });

    if (sortConfig !== null) {
        filteredServices = [...filteredServices].sort((a: any, b: any) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input type="text" placeholder="Search services..." className={styles.searchInput} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} />
                        <span>Add New Service</span>
                    </button>

                    {/* Filter Drawer Toggle */}
                    <button
                        className={styles.filterBtn}
                        onClick={() => setShowFilterDrawer(true)}
                    >
                        <Filter size={16} color="currentColor" />
                        <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                    </button>
                </div>
            </div>

            {/* Filter Drawer Panel */}
            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="services_list"
                columns={[
                    { id: 'serviceId', label: 'Service ID' },
                    { id: 'name', label: 'Service Name' },
                    { id: 'provider', label: 'Service Provider' }
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, matchType) => {
                    setFilterRules(rules);
                    setMatchType(matchType);
                    setShowFilterDrawer(false);
                }}
            />

            {/* Service List Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('serviceId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Service ID
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'serviceId' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Service Name
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'name' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th onClick={() => handleSort('provider')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Service Provider
                                    <ArrowUpDown size={14} color={sortConfig?.key === 'provider' ? 'var(--primary)' : 'var(--text-secondary-light)'} />
                                </div>
                            </th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.map((service, index) => (
                            <tr key={index}>
                                <td>
                                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{service.serviceId}</span>
                                </td>
                                <td>
                                    <span style={{ color: 'var(--text-light)' }}>{service.name}</span>
                                </td>
                                <td>
                                    <span
                                        className={styles.serviceBubble}
                                        style={getProviderStyle(service.provider || 'Unassigned')}
                                    >
                                        {service.provider || 'Unassigned'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            className={styles.actionBtn}
                                            title="Edit"
                                            onClick={() => {
                                                setEditingService(service);
                                                setIsAddModalOpen(true);
                                            }}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            className={styles.actionBtn}
                                            style={{ color: 'var(--error)' }}
                                            title="Delete"
                                            onClick={() => handleDelete(service.serviceId)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '16px 24px', color: 'var(--text-secondary-light)', fontSize: '13px', borderTop: '1px solid var(--border-light)', backgroundColor: '#f9fafb', fontWeight: 500 }}>
                    Showing {filteredServices.length} rows
                </div>
            </div>

            <AddServiceModal
                isOpen={isAddModalOpen}
                initialData={editingService}
                existingServices={availableServices}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingService(null);
                }}
                onSave={handleSaveService}
            />
        </div>
    );
}
