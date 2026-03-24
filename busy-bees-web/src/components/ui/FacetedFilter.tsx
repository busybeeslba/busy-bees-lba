import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check } from 'lucide-react';
import styles from './FacetedFilter.module.css';

export interface FacetedFilterOption {
    label: string;
    value: string;
    color?: string; // Optional color for pill badges
}

interface FacetedFilterProps {
    title: string;
    options: FacetedFilterOption[];
    selectedValues: Set<string>;
    onSelectionChange: (newSelection: Set<string>) => void;
}

export default function FacetedFilter({
    title,
    options,
    selectedValues,
    onSelectionChange
}: FacetedFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        const newSet = new Set(selectedValues);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        onSelectionChange(newSet);
    };

    const clearFilters = () => {
        onSelectionChange(new Set());
    };

    return (
        <div className={styles.facetedContainer} ref={containerRef}>
            <button
                className={`${styles.triggerBtn} ${selectedValues.size > 0 ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Filter size={14} className={styles.icon} />
                <span className={styles.title}>{title}</span>
                {selectedValues.size > 0 && (
                    <>
                        <div className={styles.separator} />
                        <div className={styles.badge}>{selectedValues.size} selected</div>
                    </>
                )}
            </button>

            {isOpen && (
                <div className={styles.popover}>
                    <div className={styles.optionsList}>
                        {options.map((option) => {
                            const isSelected = selectedValues.has(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className={styles.optionRow}
                                    onClick={() => toggleOption(option.value)}
                                >
                                    <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                                        {isSelected && <Check size={12} color="white" />}
                                    </div>
                                    {option.color ? (
                                        <div className={styles.badgePill} style={{ backgroundColor: option.color }}>
                                            {option.label}
                                        </div>
                                    ) : (
                                        <span className={styles.optionLabel}>{option.label}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {selectedValues.size > 0 && (
                        <div className={styles.popoverFooter}>
                            <button className={styles.clearBtn} onClick={clearFilters}>
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
