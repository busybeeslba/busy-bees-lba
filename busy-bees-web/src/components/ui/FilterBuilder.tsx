import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FilterRule, FilterOperator, MatchType } from '@/hooks/useDataFilter';
import styles from './FilterBuilder.module.css';

interface FilterColumn {
    id: string; // the data key
    label: string; // the human-readable name
}

interface FilterBuilderProps {
    columns: FilterColumn[];
    rules: FilterRule[];
    onRulesChange: (rules: FilterRule[]) => void;
    matchType: MatchType;
    onMatchTypeChange: (type: MatchType) => void;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
    contains: 'Contains',
    equals: 'Equals',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
    in: 'In (Faceted)', // Mostly handled separately, but listing for completeness
};

export default function FilterBuilder({
    columns,
    rules,
    onRulesChange,
    matchType,
    onMatchTypeChange,
}: FilterBuilderProps) {

    const addRule = () => {
        const newRule: FilterRule = {
            id: Math.random().toString(36).substring(2, 9),
            columnId: columns[0]?.id || '',
            operator: 'contains',
            value: '',
        };
        onRulesChange([...rules, newRule]);
    };

    const updateRule = (id: string, updates: Partial<FilterRule>) => {
        onRulesChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const removeRule = (id: string) => {
        onRulesChange(rules.filter(r => r.id !== id));
    };

    if (rules.length === 0) {
        return (
            <button onClick={addRule} className={styles.addFilterBtn}>
                <Plus size={16} /> Add Filter
            </button>
        );
    }

    return (
        <div className={styles.filterBuilderContainer}>
            <div className={styles.header}>
                <div className={styles.matchTypeToggle}>
                    <span className={styles.matchLabel}>Match</span>
                    <select
                        value={matchType}
                        onChange={(e) => onMatchTypeChange(e.target.value as MatchType)}
                        className={styles.matchSelect}
                    >
                        <option value="AND">All (AND)</option>
                        <option value="OR">Any (OR)</option>
                    </select>
                    <span className={styles.matchLabel}>of the following rules:</span>
                </div>
            </div>

            <div className={styles.rulesList}>
                {rules.map((rule) => {
                    const needsValue = rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty';

                    return (
                        <div key={rule.id} className={styles.ruleRow}>
                            <select
                                value={rule.columnId}
                                onChange={(e) => updateRule(rule.id, { columnId: e.target.value })}
                                className={styles.filterSelect}
                            >
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>{col.label}</option>
                                ))}
                            </select>

                            <select
                                value={rule.operator}
                                onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                                className={styles.filterSelect}
                            >
                                {Object.entries(OPERATOR_LABELS)
                                    .filter(([op]) => op !== 'in') // Hide 'in' from standard builder as it's for faceted
                                    .map(([op, label]) => (
                                        <option key={op} value={op}>{label}</option>
                                    ))}
                            </select>

                            {needsValue ? (
                                <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                    className={styles.filterInput}
                                    placeholder="Value..."
                                />
                            ) : (
                                <div className={styles.emptyValuePlaceholder} />
                            )}

                            <button
                                onClick={() => removeRule(rule.id)}
                                className={styles.removeRuleBtn}
                                title="Remove Rule"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <button onClick={addRule} className={styles.addRuleRowBtn}>
                <Plus size={16} /> Add Rule
            </button>
        </div>
    );
}
