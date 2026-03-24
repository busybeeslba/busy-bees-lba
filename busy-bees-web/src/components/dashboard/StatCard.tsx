import { LucideIcon } from 'lucide-react';
import styles from './Dashboard.module.css';

interface StatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    isPositive?: boolean;
    icon: LucideIcon;
}

export default function StatCard({ title, value, trend, isPositive, icon: Icon }: StatCardProps) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statHeader}>
                <span className={styles.statTitle}>{title}</span>
                <div className={styles.iconBox}>
                    <Icon size={20} color="var(--primary)" />
                </div>
            </div>
            <div className={styles.statValue}>{value}</div>
            {trend && (
                <div className={`${styles.statTrend} ${isPositive ? styles.positive : styles.negative}`}>
                    {isPositive ? '↑' : '↓'} {trend} vs last week
                </div>
            )}
        </div>
    );
}
