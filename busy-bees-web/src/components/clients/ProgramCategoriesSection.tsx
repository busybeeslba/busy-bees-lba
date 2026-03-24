'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, Check } from 'lucide-react';
import styles from './ProgramCategoriesSection.module.css';
import { dbClient } from '@/lib/dbClient';


export interface ProgramTarget {
    id: string;
    name: string;
}

export interface ProgramCategory {
    id: string;
    name: string;
    targets: ProgramTarget[];
}

interface Props {
    clientId: number | string;
    categories: ProgramCategory[];
    onUpdate: (updated: ProgramCategory[]) => void;
}

function randId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── Tag Chip Input ──────────────────────────────────────────────────────────
interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    singleTag?: boolean; // limit to one chip (for category name)
}

function TagInput({ tags, onChange, placeholder = 'Type and press Enter…', singleTag }: TagInputProps) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    function addTag() {
        const val = input.trim();
        if (!val) return;
        if (singleTag) {
            onChange([val]);
        } else if (!tags.includes(val)) {
            onChange([...tags, val]);
        }
        setInput('');
    }

    function handleKey(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') { e.preventDefault(); addTag(); }
        if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    }

    function removeTag(i: number) {
        onChange(tags.filter((_, idx) => idx !== i));
    }

    return (
        <div className={styles.tagInput} onClick={() => inputRef.current?.focus()}>
            {tags.map((t, i) => (
                <span key={i} className={styles.tag}>
                    {t}
                    <button type="button" onClick={() => removeTag(i)} className={styles.tagRemove}>
                        <X size={11} />
                    </button>
                </span>
            ))}
            {(!singleTag || tags.length === 0) && (
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className={styles.tagInputField}
                />
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProgramCategoriesSection({ clientId, categories, onUpdate }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formCatName, setFormCatName] = useState<string>('');
    const [formTargets, setFormTargets] = useState<string[]>([]);

    async function save(updated: ProgramCategory[]) {
        onUpdate(updated);
        await dbClient.patch(`/clients/${clientId}`, { programCategories: updated });
    }

    function openAdd() {
        setEditingId(null);
        setFormCatName('');
        setFormTargets([]);
        setShowForm(true);
    }

    function openEdit(cat: ProgramCategory) {
        setEditingId(cat.id);
        setFormCatName(cat.name);
        setFormTargets(cat.targets.map(t => t.name));
        setShowForm(true);
    }

    function cancel() {
        setShowForm(false);
        setEditingId(null);
        setFormCatName('');
        setFormTargets([]);
    }

    function handleSave() {
        const catName = formCatName.trim();
        if (!catName) return;
        const targets: ProgramTarget[] = formTargets.map(n => ({ id: randId(), name: n }));
        let updated: ProgramCategory[];
        if (editingId) {
            updated = categories.map(c =>
                c.id === editingId ? { ...c, name: catName, targets } : c
            );
        } else {
            updated = [...categories, { id: randId(), name: catName, targets }];
        }
        save(updated);
        cancel();
        // Auto-expand new/edited category
        if (!editingId) setExpanded(e => new Set([...e, updated[updated.length - 1].id]));
    }

    function deleteCategory(id: string) {
        save(categories.filter(c => c.id !== id));
    }

    function toggleExpand(id: string) {
        setExpanded(e => {
            const next = new Set(e);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <span className={styles.title}>Program Categories</span>
                <span className={styles.count}>{categories.length}</span>
            </div>

            {/* Category list */}
            {categories.length > 0 && (
                <div className={styles.list}>
                    {categories.map(cat => {
                        const open = expanded.has(cat.id);
                        return (
                            <div key={cat.id} className={styles.catRow}>
                                <div className={styles.catHeader} onClick={() => toggleExpand(cat.id)}>
                                    <span className={styles.chevron}>
                                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </span>
                                    <span className={styles.catName}>{cat.name}</span>
                                    <span className={styles.catBadge}>{cat.targets.length}</span>
                                    <button
                                        className={styles.iconBtn}
                                        onClick={e => { e.stopPropagation(); openEdit(cat); }}
                                        title="Edit"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                    <button
                                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                        onClick={e => { e.stopPropagation(); deleteCategory(cat.id); }}
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {open && cat.targets.length > 0 && (
                                    <div className={styles.targets}>
                                        {cat.targets.map(t => (
                                            <span key={t.id} className={styles.targetChip}>{t.name}</span>
                                        ))}
                                    </div>
                                )}
                                {open && cat.targets.length === 0 && (
                                    <p className={styles.emptyTargets}>No sub-categories yet.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Always-visible Add button */}
            <button className={styles.addBtn} onClick={openAdd}>
                <Plus size={14} />
                Add Program Category
            </button>

            {/* Modal overlay for add / edit */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={cancel}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>
                                {editingId ? 'Edit Program Category' : 'New Program Category'}
                            </span>
                            <button className={styles.modalClose} onClick={cancel}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Category Name</label>
                                <input
                                    className={styles.formInput}
                                    value={formCatName}
                                    onChange={e => setFormCatName(e.target.value)}
                                    placeholder="e.g. Colors, Transaction - Location…"
                                    list="common-categories"
                                />
                                <datalist id="common-categories">
                                    <option value="Transaction - Location" />
                                    <option value="Daily Routine" />
                                    <option value="Baseline" />
                                    <option value="Mass Trial" />
                                    <option value="Colors" />
                                    <option value="Shapes" />
                                    <option value="Numbers" />
                                </datalist>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Sub-categories</label>
                                <TagInput
                                    tags={formTargets}
                                    onChange={setFormTargets}
                                    placeholder="Type a sub-category and press Enter…"
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
                            <button className={styles.saveBtn} onClick={handleSave}>
                                <Check size={14} /> {editingId ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
