'use client';

import React from 'react';
import styles from './TransactionSheetPrintView.module.css';

export default function TransactionSheetPrintView({ sheet, printOnly = false }: { sheet: any, printOnly?: boolean }) {
    if (!sheet) return null;

    return (
        <div className={`${styles.wrapper} ${printOnly ? styles.printOnly : ''}`}>
            {/* Meta Card inside Print View */}
            <div className={styles.metaCard}>
                <div className={styles.metaGrid}>
                    <div className={styles.metaField}>
                        <div className={styles.label}>Date</div>
                        <div className={styles.value}>{sheet.date ? new Date(sheet.date + 'T12:00:00').toLocaleDateString() : '—'}</div>
                    </div>
                    <div className={styles.metaField}>
                        <div className={styles.label}>Client</div>
                        <div className={styles.value} style={{ fontSize: 16, fontWeight: 700 }}>{sheet.clientName || '—'}</div>
                    </div>
                    <div className={styles.metaField}>
                        <div className={styles.label}>Program</div>
                        <div className={styles.value}>{sheet.program || '—'}</div>
                    </div>
                    <div className={styles.metaField}>
                        <div className={styles.label}>Provider</div>
                        <div className={styles.value}>{sheet.employeeName || '—'}</div>
                    </div>
                    <div className={styles.metaField}>
                        <div className={styles.label}>Cell Phone</div>
                        <div className={styles.value}>{sheet.cellPhoneLocation || 'N/A'}</div>
                    </div>
                </div>
            </div>

            {/* Locations List */}
            {Array.isArray(sheet.locations) && sheet.locations.map((loc: any, idx: number) => {
                const locBullets = [
                    loc.transitionNote ? `Transition: ${loc.transitionNote}` : null,
                    loc.promptNote ? `Prompts: ${loc.promptNote}` : null,
                    loc.cwNote ? `Classwork: ${loc.cwNote}` : null,
                    loc.pgNote ? `Program: ${loc.pgNote}` : null,
                    loc.scheduleNote ? `Schedule: ${loc.scheduleNote}` : null,
                    loc.crisisNote ? `Crisis: ${loc.crisisNote}` : null,
                ].filter(Boolean);

                return (
                    <div key={loc.id || idx} className={styles.printLocationBlock}>
                        <h3 className={styles.printLocationTitle}>
                            <span>LOCATION {idx + 1}</span> {loc.name}
                        </h3>

                        <div className={styles.printSectionGrid}>
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Transition</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Result:</strong> {loc.transition || '___'}</div>
                                    <div className={styles.printField}><strong>Delay:</strong> {loc.delay || '___'}</div>
                                    <div className={styles.printField}><strong>Time:</strong> {loc.delayTime || '___'}</div>
                                </div>
                            </div>
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Prompts Given</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Prompt:</strong> {loc.prompt || '___'}</div>
                                    <div className={styles.printField}><strong>Given #:</strong> {loc.promptCount || '___'}</div>
                                    <div className={styles.printField}><strong>Assist:</strong> {loc.assistantNeeded || '___'}</div>
                                    <div className={styles.printField}><strong>Food:</strong> {loc.food || '___'}</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.printSectionGrid}>
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Classwork Task</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Assigned:</strong> {loc.cwTaskAssigned || '___'}</div>
                                    <div className={styles.printField}><strong>Complete:</strong> {loc.cwTaskCompleted || '___'}</div>
                                </div>
                            </div>
                            
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Program Task</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Assigned:</strong> {loc.pgTaskAssigned || '___'}</div>
                                    <div className={styles.printField}><strong>Complete:</strong> {loc.pgTaskCompleted || '___'}</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.printSectionGrid}>
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Schedule Change</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Change:</strong> {loc.scheduleChange || '___'}</div>
                                </div>
                            </div>
                            
                            <div className={styles.printSectionHalf}>
                                <div className={styles.printSectionTitle}>Crisis Called</div>
                                <div className={styles.printFieldRow}>
                                    <div className={styles.printField}><strong>Crisis:</strong> {loc.crisis || '___'}</div>
                                </div>
                            </div>
                        </div>

                        {(loc.summaryExtra || locBullets.length > 0) && (
                            <div className={styles.printSection}>
                                <div className={styles.printSectionTitle}>Compiled Notes & Summary</div>
                                <div className={styles.printNotesBox}>
                                    {locBullets.map((b, i) => <div key={i}>• {b}</div>)}
                                    {loc.summaryExtra && <div style={{ marginTop: locBullets.length > 0 ? 8 : 0 }}>{loc.summaryExtra}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
