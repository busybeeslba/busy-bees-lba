import { Activity, Clock, FileText, CheckCircle2 } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';
import OnlineStaff from '@/components/dashboard/OnlineStaff';
import LiveMap from '@/components/dashboard/LiveMap';
import LiveSessionsWidget from '@/components/dashboard/LiveSessionsWidget';
import TodaySessionsWidget from '@/components/dashboard/TodaySessionsWidget';
import TotalHoursWidget from '@/components/dashboard/TotalHoursWidget';
import { createClient } from '@/utils/supabase/server';
import {
  fetchAllSessions,
  fetchActivityFeed,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// removed recent activity helpers

export default async function Home() {
  const supabase = await createClient();

  // Fetch live data
  let sessions: any[] = [];
  let workers: any[] = [];
  let activityFeed: any[] = [];

  try {
    const [sessionsData, { data: usersData }] = await Promise.all([
      fetchAllSessions(),
      supabase.from('users').select('*')
    ]);
    
    sessions = sessionsData || [];
    workers = usersData || [];
    
  } catch (e) {
    // Fallback if shared DB isn't running
    console.warn('⚠️ Shared database or Supabase not reachable.', e);
  }

  // Calculate stats from live data

  const liveToday = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime).toDateString();
    return sessionDate === new Date().toDateString() && s.status === 'active';
  }).length;

  const allToday = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime).toDateString();
    return sessionDate === new Date().toDateString();
  }).length;

  return (
    <div className={styles.container}>
      {/* Stats Row — now pulling from the shared database */}
      <div className={styles.statsGrid}>
        <TodaySessionsWidget defaultCount={allToday} workers={workers} />
        <LiveSessionsWidget defaultCount={liveToday} workers={workers} />
        <OnlineStaff workers={workers} />
        <TotalHoursWidget />
      </div>

      <div className={styles.contentGrid}>
        {/* Map Section (visual placeholder — to be upgraded) */}
        <section className={styles.mapSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Live Map</h3>
          </div>
          <div className={styles.mapContainer} style={{ background: 'none' }}>
            <LiveMap workers={workers} />
          </div>
        </section>


      </div>
    </div>
  );
}
// force recompile
