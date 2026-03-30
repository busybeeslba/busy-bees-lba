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

// Choose the right icon for each type of activity
function getActivityIcon(type: string) {
  switch (type) {
    case 'session_complete': return CheckCircle2;
    case 'document_upload': return FileText;
    case 'session_start': return Activity;
    default: return Clock;
  }
}

// Turn an ISO timestamp into a human-friendly "X mins ago" label
function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default async function Home() {
  const supabase = await createClient();

  // Fetch live data
  let sessions: any[] = [];
  let workers: any[] = [];
  let activityFeed: any[] = [];

  try {
    const [sessionsData, activityRes, { data: usersData }] = await Promise.all([
      fetchAllSessions(),
      fetchActivityFeed(),
      supabase.from('users').select('*')
    ]);
    
    sessions = sessionsData || [];
    activityFeed = activityRes || [];
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
      <header className={styles.header}>
        <h1 className={styles.title}>Live Dashboard</h1>
        <p className={styles.subtitle}>Real-time overview of field operations.</p>
      </header>

      {/* Stats Row — now pulling from the shared database */}
      <div className={styles.statsGrid}>
        <TodaySessionsWidget defaultCount={allToday} />
        <LiveSessionsWidget defaultCount={liveToday} />
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

        {/* Activity Feed — sourced from shared database */}
        <section className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Recent Activity</h3>
          </div>
          {activityFeed.length === 0 ? (
            <p style={{ color: '#666', padding: '16px', textAlign: 'center' }}>
              No activity yet. Start a session on the mobile app!
            </p>
          ) : (
            <ul className={styles.feedList}>
              {activityFeed.map((item: any) => {
                const Icon = getActivityIcon(item.type);
                return (
                  <li key={item.id} className={styles.feedItem}>
                    <div className={styles.feedIcon}>
                      <Icon size={16} color="var(--primary)" />
                    </div>
                    <div className={styles.feedContent}>
                      <h4>{item.user}</h4>
                      <p>{item.action} • <strong>{item.target}</strong></p>
                      <span className={styles.feedTime}>{timeAgo(item.time)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
