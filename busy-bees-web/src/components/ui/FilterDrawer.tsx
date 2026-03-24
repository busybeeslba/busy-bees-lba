import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import type { FilterRule, FilterOperator, MatchType } from '@/hooks/useDataFilter';
import styles from './FilterDrawer.module.css';

interface FilterColumn {
    id: string; // the data key
    label: string; // the human-readable name
}

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    columns: FilterColumn[];
    rules: FilterRule[];
    matchType: MatchType;
    onApply: (rules: FilterRule[], matchType: MatchType) => void;
    storageKey?: string; // Add storageKey to isolate saved filters per page
}

export interface SavedFilter {
    id: string;
    name: string;
    rules: FilterRule[];
    matchType: MatchType;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
    contains: 'Contains',
    equals: 'Is',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    isEmpty: 'Is Empty',
    isNotEmpty: 'Is Not Empty',
    in: 'In (Faceted)', // Mostly handled separately
};

export default function FilterDrawer({
    isOpen,
    onClose,
    columns,
    rules,
    matchType,
    onApply,
    storageKey
}: FilterDrawerProps) {
    const [draftRules, setDraftRules] = useState<FilterRule[]>([]);
    const [draftMatchType, setDraftMatchType] = useState<MatchType>('AND');

    // Saved filter state
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
    const [selectedFilterId, setSelectedFilterId] = useState<string>('');
    const [filterName, setFilterName] = useState('');

    // Load from local storage
    useEffect(() => {
        if (storageKey) {
            const stored = localStorage.getItem(`busy_bees_filters_${storageKey}`);
            if (stored) {
                try {
                    setSavedFilters(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse saved filters", e);
                }
            }
        }
    }, [storageKey]);

    const persistFilters = (newFilters: SavedFilter[]) => {
        setSavedFilters(newFilters);
        if (storageKey) {
            localStorage.setItem(`busy_bees_filters_${storageKey}`, JSON.stringify(newFilters));
        }
    };

    // Sync draft state when drawer opens
    useEffect(() => {
        if (isOpen) {
            setDraftRules(rules);
            setDraftMatchType(matchType);
        }
    }, [isOpen, rules, matchType]);

    // Handle closing via overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleApply = () => {
        onApply(draftRules, draftMatchType);
    };

    const handleReset = () => {
        setDraftRules([]);
        setDraftMatchType('AND');
        setSelectedFilterId('');
        setFilterName('');
        onApply([], 'AND');
    };

    const handleSaveFilter = () => {
        if (!filterName.trim()) return;

        const currentName = filterName.trim();
        const existingByName = savedFilters.find(f => f.name.toLowerCase() === currentName.toLowerCase());
        const isSelected = selectedFilterId && savedFilters.find(f => f.id === selectedFilterId)?.name === currentName;

        if (isSelected || existingByName) {
            const targetId = isSelected ? selectedFilterId : existingByName!.id;
            // Update existing
            const updated = savedFilters.map(f =>
                f.id === targetId ? { ...f, rules: draftRules, matchType: draftMatchType, name: currentName } : f
            );
            persistFilters(updated);
            setSelectedFilterId(targetId);
        } else {
            // Create new
            const newFilter: SavedFilter = {
                id: Math.random().toString(36).substring(2, 9),
                name: currentName,
                rules: draftRules,
                matchType: draftMatchType,
            };
            persistFilters([...savedFilters, newFilter]);
            setSelectedFilterId(newFilter.id);
        }
    };

    const handleSelectSavedFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedFilterId(id);
        if (id) {
            const f = savedFilters.find(x => x.id === id);
            if (f) {
                setDraftRules(f.rules);
                setDraftMatchType(f.matchType);
                setFilterName(f.name);
            }
        } else {
            setFilterName('');
        }
    };

    const handleDeleteSavedFilter = () => {
        if (selectedFilterId && window.confirm('Are you sure you want to delete this saved filter?')) {
            persistFilters(savedFilters.filter(f => f.id !== selectedFilterId));
            setSelectedFilterId('');
            setFilterName('');
        }
    };

    const addRule = () => {
        const newRule: FilterRule = {
            id: Math.random().toString(36).substring(2, 9),
            columnId: columns[0]?.id || '',
            operator: 'contains',
            value: '',
        };
        setDraftRules([...draftRules, newRule]);
    };

    const updateRule = (id: string, updates: Partial<FilterRule>) => {
        setDraftRules(draftRules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const removeRule = (id: string) => {
        setDraftRules(draftRules.filter(r => r.id !== id));
    };

    // Add 1 default rule if array is empty when opened
    useEffect(() => {
        if (isOpen && draftRules.length === 0) {
            addRule();
        }
    }, [isOpen]);


    return (
        <div className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`} onClick={handleOverlayClick}>
            <div className={styles.drawerContent}>
                {/* Header */}
                <div className={styles.header}>
                    <h2>Filters</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close filters">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className={styles.body}>
                    <div className={styles.sectionSection}>
                        <label className={styles.sectionLabel}>SAVED FILTERS</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                className={styles.selectInput}
                                value={selectedFilterId}
                                onChange={handleSelectSavedFilter}
                            >
                                <option value="">Select a saved filter...</option>
                                {savedFilters.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                            {selectedFilterId && (
                                <button
                                    onClick={handleDeleteSavedFilter}
                                    className={styles.removeRuleIcon}
                                    style={{ flexShrink: 0, marginTop: 0 }}
                                    title="Delete Saved Filter"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.saveFilterBox}>
                        <label className={styles.sectionLabel}>SAVE CURRENT FILTER</label>
                        <div className={styles.saveFilterRow}>
                            <input
                                type="text"
                                placeholder="Filter Name..."
                                className={styles.textInput}
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                            />
                            <button
                                className={styles.saveBtn}
                                onClick={handleSaveFilter}
                                disabled={!filterName.trim()}
                                style={{ opacity: filterName.trim() ? 1 : 0.5 }}
                            >
                                <Save size={14} />
                                <span>
                                    {selectedFilterId && savedFilters.find(f => f.id === selectedFilterId)?.name === filterName.trim() ? 'Update' : 'Save'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className={styles.matchToggleGroup}>
                        <button
                            className={`${styles.matchToggleBtn} ${draftMatchType === 'AND' ? styles.active : ''}`}
                            onClick={() => setDraftMatchType('AND')}
                        >
                            Match All
                        </button>
                        <button
                            className={`${styles.matchToggleBtn} ${draftMatchType === 'OR' ? styles.active : ''}`}
                            onClick={() => setDraftMatchType('OR')}
                        >
                            Match Any
                        </button>
                    </div>

                    <div className={styles.rulesList}>
                        {draftRules.map((rule) => {
                            const needsValue = rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty';

                            return (
                                <div key={rule.id} className={styles.ruleCard}>
                                    <div className={styles.ruleHeader}>
                                        <button
                                            onClick={() => removeRule(rule.id)}
                                            className={styles.removeRuleIcon}
                                            title="Remove Rule"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className={styles.ruleStack}>
                                        <select
                                            value={rule.columnId}
                                            onChange={(e) => updateRule(rule.id, { columnId: e.target.value })}
                                            className={styles.selectInput}
                                        >
                                            {columns.map(col => (
                                                <option key={col.id} value={col.id}>{col.label}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={rule.operator}
                                            onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                                            className={styles.selectInput}
                                        >
                                            {Object.entries(OPERATOR_LABELS)
                                                .filter(([op]) => op !== 'in')
                                                .map(([op, label]) => (
                                                    <option key={op} value={op}>{label}</option>
                                                ))}
                                        </select>

                                        {needsValue && (
                                            <input
                                                type="text"
                                                value={rule.value}
                                                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                                className={styles.textInput}
                                                placeholder="Value..."
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={addRule} className={styles.addRuleBtn}>
                        <Plus size={16} /> Add Rule
                    </button>
                </div>

                {/* Fixed Footer */}
                <div className={styles.footer}>
                    <button className={styles.resetBtn} onClick={handleReset}>
                        Reset
                    </button>
                    <button className={styles.applyBtn} onClick={handleApply}>
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
