import React, { useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import styles from './TableSettingsDrawer.module.css';
import { ColumnDef } from '@/hooks/useTableSettings';

interface TableSettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    // We pass the raw active components from the hook to the drawer
    columns: ColumnDef<any>[];
    hiddenColumnIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    onMoveColumn: (draggedId: string, targetId: string) => void;
    onReset: () => void;
}

export default function TableSettingsDrawer({
    isOpen,
    onClose,
    columns,
    hiddenColumnIds,
    onToggleVisibility,
    onMoveColumn,
    onReset
}: TableSettingsDrawerProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault(); // Necessary to allow dropping
        if (draggedId !== id) {
            setDragOverId(id);
        }
    };

    const handleDragLeave = (e: React.DragEvent, id: string) => {
        if (dragOverId === id) {
            setDragOverId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        setDragOverId(null);
        if (draggedId && draggedId !== targetId) {
            onMoveColumn(draggedId, targetId);
        }
        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    return (
        <div className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`} onClick={handleOverlayClick}>
            <div className={styles.drawerContent}>
                <div className={styles.header}>
                    <h2>Page Settings</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <label className={styles.sectionLabel}>COLUMNS CONFIGURATION</label>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)', marginBottom: '16px' }}>
                        Drag to reorder columns. Toggle switches to show or hide them from your data table.
                    </p>

                    <div className={styles.columnsList}>
                        {columns.map((col) => {
                            const isHidden = hiddenColumnIds.has(col.id);
                            const isDragged = draggedId === col.id;
                            const isDragOver = dragOverId === col.id;

                            // Skip rendering items if they are forced hidden and not configurable (optional feature)
                            // For now we allow all columns to be configurable
                            return (
                                <div 
                                    key={col.id} 
                                    className={`
                                        ${styles.columnItem} 
                                        ${isDragged ? styles.dragged : ''} 
                                        ${isDragOver ? styles.dragover : ''}
                                    `}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, col.id)}
                                    onDragOver={(e) => handleDragOver(e, col.id)}
                                    onDragLeave={(e) => handleDragLeave(e, col.id)}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className={styles.dragHandle} title="Drag to reorder">
                                        <GripVertical size={16} />
                                    </div>
                                    <div className={styles.columnLabel} style={{ opacity: isHidden ? 0.5 : 1 }}>
                                        {col.label}
                                    </div>
                                    <label className={styles.toggleSwitch} title={isHidden ? "Show Column" : "Hide Column"}>
                                        <input 
                                            type="checkbox" 
                                            checked={!isHidden} 
                                            onChange={() => onToggleVisibility(col.id)} 
                                        />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.resetBtn} onClick={onReset}>
                        Restore Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
