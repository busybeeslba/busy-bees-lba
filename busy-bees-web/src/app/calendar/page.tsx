import styles from './Calendar.module.css';
import AvailabilityCalendar from '../users/[id]/AvailabilityCalendar';

export default function CalendarPage() {
    return (
        <div className={styles.container}>            
            <AvailabilityCalendar />
        </div>
    );
}
