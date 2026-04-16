'use client';

import React, { useState, useEffect } from 'react';
import { Search, Clock, Filter, ArrowUpDown, Trash2, MoreVertical } from 'lucide-react';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import FacetedFilter from '@/components/ui/FacetedFilter';
import styles from '../page.module.css';
import { dbClient } from '@/lib/dbClient';


export default function ClientServicesPage() {
    const [assignedServices, setAssignedServices] = useState<any[]>([]);
    const [availableServices, setAvailableServices] = useState<any[]>([]);

    // Advanced Filter State
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { id: 'serviceId', label: 'Service ID', sortKey: 'serviceId', renderCell: (service: any) => <td key="serviceId"><span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{service.serviceId}</span></td> },
        { id: 'clientId', label: 'Client ID', sortKey: 'clientId', renderCell: (service: any) => <td key="clientId"><span style={{ color: 'var(--text-secondary-light)' }}>{service.clientId}</span></td> },
        { id: 'childName', label: "Child's Name", sortKey: 'childName', renderCell: (service: any) => <td key="childName"><span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{service.childName}</span></td> },
        { id: 'type', label: 'Services Type', sortKey: 'type', renderCell: (service: any) => <td key="type"><span style={{ color: 'var(--text-light)' }}>{service.type}</span></td> },
        { id: 'provider', label: 'Service Provider', sortKey: 'provider', renderCell: (service: any) => <td key="provider"><span style={{ color: 'var(--text-secondary-light)' }}>{service.provider}</span></td> },
        { id: 'hours', label: 'Services Hours', sortKey: 'hours', renderCell: (service: any) => <td key="hours"><span className={styles.durationBadge}><Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{service.hours}</span></td> },
        { id: 'hoursUsed', label: 'Hours Used', renderCell: (service: any) => <td key="hoursUsed"><span className={styles.durationBadge} style={{ backgroundColor: 'var(--background-light)', color: 'var(--text-secondary-light)' }}><Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />0h</span></td> },
        { id: 'remainHours', label: 'Remain Hours', renderCell: (service: any) => <td key="remainHours"><span className={styles.durationBadge} style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--success)' }}><Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{service.hours}</span></td> }
    ], [styles]);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('client_services_table_config', COLUMNS);


    useEffect(() => {
        // Fetch both resources in parallel from the shared database
        Promise.all([
            dbClient.get('/clients').catch(() => []),
            dbClient.get('/available_services').catch(() => []),
        ]).then(([clients, services]: [any[], any[]]) => {
            setAvailableServices(services);

            // Derive the flat list of assigned services from all clients
            const derivedServices: any[] = [];
            clients.forEach((client: any) => {
                if (Array.isArray(client.services)) {
                    client.services.forEach((srv: any, idx: number) => {
                        const serviceDef = services.find((s: any) => s.serviceId === srv.serviceId);
                        const serviceName = serviceDef ? serviceDef.name : srv.serviceId;
                        const serviceProvider = serviceDef ? (serviceDef.provider || 'Unassigned') : 'Unassigned';
                        derivedServices.push({
                            uniqueId: `${client.id}-${srv.serviceId}-${idx}`,
                            serviceId: srv.serviceId,
                            clientId: `CLI-${client.id}`,
                            childName: client.kidsName || client.name || '',
                            type: serviceName,
                            provider: serviceProvider,
                            hours: srv.hours || '0h',
                        });
                    });
                }
            });
            setAssignedServices(derivedServices);
        });
    }, []);

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} assigned service(s)?`)) return;
        try {
            // Group deletions by client.id
            const deletionsByClient: Record<string, string[]> = {};
            Array.from(selectedIds).forEach(uniqueId => {
                const parts = uniqueId.split('-');
                if (parts.length >= 3) {
                    const clientId = parts[0];
                    const serviceId = parts[1];
                    if (!deletionsByClient[clientId]) deletionsByClient[clientId] = [];
                    deletionsByClient[clientId].push(serviceId);
                }
            });

            // Process each client
            await Promise.all(Object.entries(deletionsByClient).map(async ([clientId, serviceIdsToRemove]) => {
                const client = await dbClient.get(`/clients/${clientId}`);
                if (client && Array.isArray(client.services)) {
                    // Remove the services being deleted
                    const updatedServices = client.services.filter((s: any) => !serviceIdsToRemove.includes(s.serviceId));
                    await dbClient.patch(`/clients/${clientId}`, { services: updatedServices });
                }
            }));
            
            // Trigger a re-fetch
            const [clients, services] = await Promise.all([
                dbClient.get('/clients').catch(() => []),
                dbClient.get('/available_services').catch(() => []),
            ]);
            
            setAvailableServices(services);
            const derivedServices: any[] = [];
            clients.forEach((client: any) => {
                if (Array.isArray(client.services)) {
                    client.services.forEach((srv: any, idx: number) => {
                        const serviceDef = services.find((s: any) => s.serviceId === srv.serviceId);
                        derivedServices.push({
                            uniqueId: `${client.id}-${srv.serviceId}-${idx}`,
                            serviceId: srv.serviceId,
                            clientId: `CLI-${client.id}`,
                            childName: client.kidsName || client.name || '',
                            type: serviceDef ? serviceDef.name : srv.serviceId,
                            provider: serviceDef ? (serviceDef.provider || 'Unassigned') : 'Unassigned',
                            hours: srv.hours || '0h',
                        });
                    });
                }
            });
            setAssignedServices(derivedServices);
            setSelectedIds(new Set());
            
        } catch {
            alert('Could not delete some assigned services.');
        }
    };




    // Apply Advanced Filters
    let filteredServices = useDataFilter({
        data: assignedServices,
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
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
                <div className={styles.searchBox}>
                    <Search size={20} color="var(--text-secondary-light)" />
                    <input type="text" placeholder="Search client services..." className={styles.searchInput} />
                </div>

                {selectedIds.size > 0 && (
                    <button 
                        onClick={handleBulkDelete}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                        <Trash2 size={16} /> Delete Selected ({selectedIds.size})
                    </button>
                )}
                {/* Filter Drawer Toggle */}
                <button
                    className={styles.filterBtn}
                    style={{ marginLeft: selectedIds.size > 0 ? '0' : 'auto' }}
                    onClick={() => setShowFilterDrawer(true)}
                >
                    <Filter size={16} color="currentColor" />
                    <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                </button>
                <button className={styles.filterBtn} onClick={() => setShowSettingsDrawer(true)} title="Page Settings" style={{ padding: '8px' }}>
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Filter Drawer Panel */}
            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="client_services"
                columns={[
                    { id: 'serviceId', label: 'Service ID' },
                    { id: 'clientId', label: 'Client ID' },
                    { id: 'childName', label: 'Child Name' },
                    { id: 'type', label: 'Service Type' },
                    { id: 'provider', label: 'Provider' }
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, matchType) => {
                    setFilterRules(rules);
                    setMatchType(matchType);
                    setShowFilterDrawer(false);
                }}
            />

            {/* Client Services Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center', cursor: 'pointer' }} onClick={() => {
                                if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
                                    setSelectedIds(new Set());
                                } else {
                                    setSelectedIds(new Set(filteredServices.map((s: any) => s.uniqueId)));
                                }
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={filteredServices.length > 0 && selectedIds.size === filteredServices.length} 
                                    onChange={() => {
                                        if (selectedIds.size === filteredServices.length && filteredServices.length > 0) {
                                            setSelectedIds(new Set());
                                        } else {
                                            setSelectedIds(new Set(filteredServices.map((s: any) => s.uniqueId)));
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
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                                <tr key={service.uniqueId} className={selectedIds.has(service.uniqueId) ? styles.checkedRow : ''}>
                                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(service.uniqueId)}
                                            onChange={() => {
                                                const next = new Set(selectedIds);
                                                if (next.has(service.uniqueId)) next.delete(service.uniqueId);
                                                else next.add(service.uniqueId);
                                                setSelectedIds(next);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    {activeColumns.map(col => col.renderCell?.(service))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary-light)' }}>
                                    No services currently assigned to any clients.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div style={{ position: 'sticky', bottom: 0, zIndex: 10, padding: '16px 24px', color: 'var(--text-secondary-light)', fontSize: '13px', borderTop: '1px solid var(--border-light)', backgroundColor: '#f9fafb', fontWeight: 500 }}>
                    Showing {filteredServices.length} rows
                </div>
            </div>
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
