'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Filter, ArrowUpDown, MoreVertical } from 'lucide-react';
import AddServiceModal from '@/components/services/AddServiceModal';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import FacetedFilter from '@/components/ui/FacetedFilter';
import styles from '../page.module.css';
import { MOCK_AVAILABLE_SERVICES } from '@/lib/mockData';
import { dbClient } from '@/lib/dbClient';


export default function ServiceListPage() {
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
                // Safely map description into the provider column to gracefully bypass Supabase Schema constraints
                const payload = { name: newService.type, provider: newService.description };
                const saved = await dbClient.patch(`/available_services/${editingService.id || editingService.serviceId}`, payload);
                const updated = availableServices.map(s =>
                    s.serviceId === editingService.serviceId ? { ...s, ...saved } : s
                );
                setAvailableServices(updated);
                localStorage.setItem('busy_bees_services', JSON.stringify(updated));
            } else {
                // POST new
                const payload = { id: newService.serviceId, serviceId: newService.serviceId, name: newService.type, provider: newService.description };
                const saved = await dbClient.post('/available_services', payload);
                const updated = [saved, ...availableServices];
                setAvailableServices(updated);
                localStorage.setItem('busy_bees_services', JSON.stringify(updated));
            }
        } catch {
            alert('Could not save service — is the shared database running on port 3011?');
        }
        setEditingService(null);
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

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected service(s)?`)) return;
        try {
            await Promise.all(Array.from(selectedIds).map(id => dbClient.delete(`/available_services/${id}`)));
            const updated = availableServices.filter(s => !selectedIds.has(s.serviceId));
            setAvailableServices(updated);
            localStorage.setItem('busy_bees_services', JSON.stringify(updated));
            setSelectedIds(new Set());
        } catch {
            alert('Could not delete some services.');
        }
    };


    // Removing getProviderStyle completely since we render plain text descriptions now

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { 
            id: 'serviceId', 
            label: 'Service ID', 
            sortKey: 'serviceId', 
            renderCell: (service: any) => (
                <td key="serviceId">
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{service.serviceId}</span>
                </td>
            )
        },
        { 
            id: 'name', 
            label: 'Service Name', 
            sortKey: 'name', 
            renderCell: (service: any) => (
                <td key="name">
                    <span style={{ color: 'var(--text-light)' }}>{service.name}</span>
                </td>
            )
        },
        { 
            id: 'description', 
            label: 'Service Description', 
            // In the DB it is stored as 'provider' so use 'provider' for actual sorting key
            sortKey: 'provider', 
            renderCell: (service: any) => (
                <td key="description">
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {service.provider || ''}
                    </span>
                </td>
            )
        }
    ], []);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('services_list_table_config', COLUMNS);


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
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                            <Trash2 size={16} /> Delete Selected ({selectedIds.size})
                        </button>
                    )}
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

                    <button className={styles.filterBtn} onClick={() => setShowSettingsDrawer(true)} title="Page Settings" style={{ padding: '8px' }}>
                        <MoreVertical size={20} />
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
                    { id: 'provider', label: 'Service Description' }
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
                            <th style={{ width: '40px', textAlign: 'center', cursor: 'pointer' }} onClick={() => {
                                if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
                                    setSelectedIds(new Set());
                                } else {
                                    setSelectedIds(new Set(filteredServices.map(s => s.serviceId)));
                                }
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={filteredServices.length > 0 && selectedIds.size === filteredServices.length} 
                                    onChange={() => {
                                        if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
                                            setSelectedIds(new Set());
                                        } else {
                                            setSelectedIds(new Set(filteredServices.map(s => s.serviceId)));
                                        }
                                    }} 
                                    onClick={e => e.stopPropagation()}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            {activeColumns.map(col => (
                                <th 
                                    key={col.id} 
                                    onClick={col.sortKey ? () => handleSort(col.sortKey as string) : undefined} 
                                    style={{ minWidth: col.minWidth, cursor: col.sortKey ? 'pointer' : 'default', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {col.label}
                                        {col.sortKey && <ArrowUpDown size={14} color={sortConfig?.key === col.sortKey ? 'var(--primary)' : 'var(--text-secondary-light)'} />}
                                    </div>
                                </th>
                            ))}
                            <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.map((service, index) => (
                            <tr key={index} className={selectedIds.has(service.serviceId) ? styles.checkedRow : ''}>
                                <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(service.serviceId)}
                                        onChange={() => {
                                            const next = new Set(selectedIds);
                                            if (next.has(service.serviceId)) next.delete(service.serviceId);
                                            else next.add(service.serviceId);
                                            setSelectedIds(next);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </td>
                                {activeColumns.map(col => col.renderCell?.(service))}
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

            <TableSettingsDrawer 
                isOpen={showSettingsDrawer}
                onClose={() => setShowSettingsDrawer(false)}
                columns={allColumnsOrdered}
                hiddenColumnIds={hiddenColumnIds}
                onToggleVisibility={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onReset={resetToDefaults}
            />
        </div>
    );
}
