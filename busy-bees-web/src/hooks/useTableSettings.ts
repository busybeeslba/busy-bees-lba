import { useState, useEffect, useMemo, useCallback } from 'react';

export interface ColumnDef<T = any> {
    id: string;
    label: string;
    sortKey?: string;
    minWidth?: string;
    renderHeader?: () => React.ReactNode;
    renderCell?: (row: T) => React.ReactNode;
    defaultVisible?: boolean;
}

export function useTableSettings<T>(storageKey: string, initialColumns: ColumnDef<T>[]) {
    const [orderedColumnIds, setOrderedColumnIds] = useState<string[]>([]);
    const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fullStorageKey = `busy_bees_table_${storageKey}`;
        const stored = localStorage.getItem(fullStorageKey);

        let initialOrderedIds = initialColumns.map(c => c.id);
        let initialHiddenIds = new Set<string>(
            initialColumns.filter(c => c.defaultVisible === false).map(c => c.id)
        );

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed.orderedIds)) {
                    // Filter out any IDs that no longer exist in the actual initialColumns definition
                    const validStoredIds = parsed.orderedIds.filter((id: string) => 
                        initialColumns.some(c => c.id === id)
                    );
                    
                    // Add any NEW columns that were defined in initialColumns but aren't in local storage yet
                    const newIds = initialColumns
                        .filter(c => !parsed.orderedIds.includes(c.id))
                        .map(c => c.id);

                    initialOrderedIds = [...validStoredIds, ...newIds];
                }

                if (Array.isArray(parsed.hiddenIds)) {
                    initialHiddenIds = new Set(parsed.hiddenIds);
                }
            } catch (e) {
                console.error("Failed to parse table settings for", storageKey, e);
            }
        }

        setOrderedColumnIds(initialOrderedIds);
        setHiddenColumnIds(initialHiddenIds);
        setIsLoaded(true);
    }, [storageKey]); // Intentionally not including initialColumns to avoid reset on every render

    // Save state to localstorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return;
        const payload = {
            orderedIds: orderedColumnIds,
            hiddenIds: Array.from(hiddenColumnIds)
        };
        localStorage.setItem(`busy_bees_table_${storageKey}`, JSON.stringify(payload));
    }, [orderedColumnIds, hiddenColumnIds, storageKey, isLoaded]);

    const toggleColumnVisibility = useCallback((colId: string) => {
        setHiddenColumnIds(prev => {
            const next = new Set(prev);
            if (next.has(colId)) {
                next.delete(colId);
            } else {
                next.add(colId);
            }
            return next;
        });
    }, []);

    const moveColumn = useCallback((draggedId: string, targetId: string) => {
        setOrderedColumnIds(prev => {
            const draggedIdx = prev.indexOf(draggedId);
            const targetIdx = prev.indexOf(targetId);
            if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return prev;

            const next = [...prev];
            const [item] = next.splice(draggedIdx, 1);
            next.splice(targetIdx, 0, item);
            return next;
        });
    }, []);

    const resetToDefaults = useCallback(() => {
        setOrderedColumnIds(initialColumns.map(c => c.id));
        setHiddenColumnIds(new Set(initialColumns.filter(c => c.defaultVisible === false).map(c => c.id)));
    }, [initialColumns]);

    // Computed derived states
    const activeColumns = useMemo(() => {
        // Map the IDs to physical objects
        return orderedColumnIds
            .map(id => initialColumns.find(c => c.id === id))
            .filter((c): c is ColumnDef<T> => c !== undefined && !hiddenColumnIds.has(c.id));
    }, [orderedColumnIds, hiddenColumnIds, initialColumns]);

    const allColumnsOrdered = useMemo(() => {
        return orderedColumnIds
            .map(id => initialColumns.find(c => c.id === id))
            .filter((c): c is ColumnDef<T> => c !== undefined);
    }, [orderedColumnIds, initialColumns]);

    return {
        isLoaded,
        activeColumns,
        allColumnsOrdered,
        hiddenColumnIds,
        toggleColumnVisibility,
        moveColumn,
        resetToDefaults
    };
}
