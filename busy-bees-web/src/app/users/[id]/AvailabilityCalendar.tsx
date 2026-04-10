'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import styles from './AvailabilityCalendar.module.css';

import { dbClient } from '@/lib/dbClient';

interface AvailabilitySlot {
    id: string | number;
    employeeId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM:SS
    endTime: string; // HH:MM:SS
}

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
};

export default function AvailabilityCalendar({ userId }: { userId?: string }) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<'month' | 'week' | 'day'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Add Slot Modal State
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newSlot, setNewSlot] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00 AM',
        endTime: '05:00 PM'
    });

    const TIME_SLOTS = [
        '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
        '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
        '05:00 PM', '05:30 PM', '06:00 PM'
    ];

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const endpoint = userId
                ? `/schedule?employeeId=${userId}&status=available`
                : `/schedule?status=available`;
                
            const [data, usersData] = await Promise.all([
                dbClient.get(endpoint),
                dbClient.get('/users')
            ]);
            
            setSlots(data || []);
            
            if (usersData && Array.isArray(usersData)) {
                const map: Record<string, string> = {};
                usersData.forEach(u => {
                    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
                    if (u.employeeId) map[u.employeeId] = fullName || u.employeeId;
                    if (u.id) map[u.id] = fullName || u.id;
                });
                setUsersMap(map);
            }
        } catch (err) {
            console.error("Failed to fetch availability:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailability();
    }, [userId]);

    const getEmployeeName = (empId: string) => usersMap[empId] || empId || 'Worker';

    // Helpers
    const handleSaveSlot = async () => {
        setIsSaving(true);
        try {
            await dbClient.post('/schedule', {
                employeeId: userId,
                date: newSlot.date,
                startTime: newSlot.startTime,
                endTime: newSlot.endTime,
                status: 'available'
            });
            setShowAddSlot(false);
            fetchAvailability();
            setNewSlot({
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00 AM',
                endTime: '05:00 PM'
            });
        } catch (err) {
            console.error("Failed to save slot:", err);
            alert("Failed to save slot. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    const prevPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() - 1);
        else if (view === 'week') d.setDate(d.getDate() - 7);
        else if (view === 'day') d.setDate(d.getDate() - 1);
        setCurrentDate(d);
    };

    const nextPeriod = () => {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() + 1);
        else if (view === 'week') d.setDate(d.getDate() + 7);
        else if (view === 'day') d.setDate(d.getDate() + 1);
        setCurrentDate(d);
    };

    const getDaysInWeek = (date: Date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const getMonthDays = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const endDate = new Date(lastDay);
        if (endDate.getDay() !== 6) {
            endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        }

        const days = [];
        let current = new Date(startDate);
        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const getPeriodLabel = () => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (view === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else if (view === 'week') {
            const weekDays = getDaysInWeek(currentDate);
            const start = weekDays[0];
            const end = weekDays[6];
            return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
        } else {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        }
    };

    const renderMonthView = () => {
        const monthDays = getMonthDays(currentDate);
        const currentMonth = currentDate.getMonth();

        return (
            <>
                <div className={styles.dayHeaders}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <div key={i} className={styles.dayHeader} style={{ padding: '8px' }}>
                            <span className={styles.dayName}>{d}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.monthGrid}>
                    {monthDays.map((day, i) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const daySlots = slots.filter(s => s.date === dateStr);
                        const isOtherMonth = day.getMonth() !== currentMonth;
                        const isToday = new Date().toDateString() === day.toDateString();

                        return (
                            <div key={i} className={`${styles.monthCell} ${isOtherMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}>
                                <div className={styles.monthCellDate}>{day.getDate()}</div>
                                {daySlots.map(slot => (
                                    <div key={slot.id} className={styles.monthSlot}>
                                        <Clock size={10} style={{ flexShrink: 0 }} />
                                        {!userId && <span style={{ fontWeight: 600, marginRight: '4px' }}>{getEmployeeName(slot.employeeId)}</span>}
                                        <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    const renderWeekView = () => {
        const weekDays = getDaysInWeek(currentDate);
        return (
            <>
                <div className={styles.dayHeaders}>
                    {weekDays.map((day, i) => {
                        const isToday = new Date().toDateString() === day.toDateString();
                        return (
                            <div key={i} className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}>
                                <span className={styles.dayName}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}</span>
                                <span className={styles.dayNumber}>{day.getDate()}</span>
                            </div>
                        );
                    })}
                </div>
                <div className={styles.grid}>
                    {weekDays.map((day, i) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const daySlots = slots.filter(s => s.date === dateStr);

                        return (
                            <div key={i} className={styles.dayColumn}>
                                {daySlots.length === 0 ? (
                                    <div className={styles.emptySlot}>-</div>
                                ) : (
                                    daySlots.map(slot => (
                                        <div key={slot.id} className={styles.timeBlock}>
                                            <Clock size={12} className={styles.clockIcon} />
                                            <div className={styles.timeText}>
                                                {!userId && <span style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>{getEmployeeName(slot.employeeId)}</span>}
                                                <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const daySlots = slots.filter(s => s.date === dateStr);

        return (
            <div className={styles.dayGrid}>
                {daySlots.length === 0 ? (
                    <div className={styles.emptySlot}>No availability slots for this day.</div>
                ) : (
                    daySlots.map(slot => (
                        <div key={slot.id} className={styles.dayViewTimeBlock}>
                            <Clock size={20} className={styles.clockIcon} />
                            <div className={styles.dayViewTimeText}>
                                {!userId && <span style={{ fontWeight: 600, marginRight: '6px' }}>{getEmployeeName(slot.employeeId)}:</span>}
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    return (
        <div className={styles.calendarContainer}>
            {/* Header Controls */}
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={20} color="var(--primary)" />
                    <h3 className={styles.title}>Availability Schedule</h3>
                </div>

                <div className={styles.controls}>
                    {/* View Segmented Control */}
                    <div className={styles.viewSelector}>
                        <button
                            className={styles.viewBtn}
                            data-active={view === 'month'}
                            onClick={() => setView('month')}>Month</button>
                        <button
                            className={styles.viewBtn}
                            data-active={view === 'week'}
                            onClick={() => setView('week')}>Week</button>
                        <button
                            className={styles.viewBtn}
                            data-active={view === 'day'}
                            onClick={() => setView('day')}>Day</button>
                    </div>

                    <button onClick={prevPeriod} className={styles.iconBtn}><ChevronLeft size={16} /></button>
                    <span className={styles.weekLabel}>{getPeriodLabel()}</span>
                    <button onClick={nextPeriod} className={styles.iconBtn}><ChevronRight size={16} /></button>

                    {userId && (
                        <button className={styles.addSlotBtn} onClick={() => setShowAddSlot(true)}>
                            <Plus size={16} /> Add Slot
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Loading schedule...</p>
                </div>
            ) : (
                <div className={styles.gridWrapper}>
                    {view === 'month' && renderMonthView()}
                    {view === 'week' && renderWeekView()}
                    {view === 'day' && renderDayView()}
                </div>
            )}

            {/* Add Slot Modal */}
            {showAddSlot && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90vw' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Add Availability Slot</h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Date</label>
                            <input
                                type="date"
                                value={newSlot.date}
                                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Start Time</label>
                                <select
                                    value={newSlot.startTime}
                                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }}
                                >
                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>End Time</label>
                                <select
                                    value={newSlot.endTime}
                                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)' }}
                                >
                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setShowAddSlot(false)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSlot}
                                disabled={isSaving}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#000', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {isSaving ? "Saving..." : "Save Slot"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
