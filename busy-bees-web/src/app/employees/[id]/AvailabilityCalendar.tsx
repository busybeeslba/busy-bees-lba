'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import styles from './AvailabilityCalendar.module.css';
import { dbClient } from '@/lib/dbClient';

interface AvailabilitySlot {
    id: string;
    employeeId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM AM/PM
    endTime: string; // HH:MM AM/PM
}

export default function AvailabilityCalendar({ employeeId }: { employeeId: string }) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<'month' | 'week' | 'day'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const res = await dbClient.get(`/availability?employeeId=${employeeId}`);
                if (!res.ok) throw new Error('Failed to fetch availability');
                const data = res; // Was .json()
                setSlots(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [employeeId]);

    // Helpers
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
                                        <Clock size={10} /> {slot.startTime}
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
                                                <span>{slot.startTime}</span>
                                                <span className={styles.timeSeparator}>to</span>
                                                <span>{slot.endTime}</span>
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
                                {slot.startTime} - {slot.endTime}
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

                    <button className={styles.addSlotBtn}>
                        <Plus size={16} /> Add Slot
                    </button>
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
        </div>
    );
}
