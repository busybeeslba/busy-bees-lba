import { Activity, Users, Clock, FileText, CheckCircle2, MapPin } from 'lucide-react';
import styles from '@/components/dashboard/Dashboard.module.css';
import StatCard from '@/components/dashboard/StatCard';
import {
  fetchAllSessions,
  fetchFieldWorkers,
  fetchActivityFeed,
} from '@/lib/api';

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

  // Fetch live data from our shared database (running at localhost:3011)
  let sessions: any[] = [];
  let workers: any[] = [];
  let activityFeed: any[] = [];

  try {
    [sessions, workers, activityFeed] = await Promise.all([
      fetchAllSessions(),
      fetchFieldWorkers(),
      fetchActivityFeed(),
    ]);
  } catch {
    // If the shared DB isn't running, fall back to empty arrays gracefully
    console.warn('⚠️  Shared database not reachable. Is it running on port 3011?');
  }

  // Calculate stats from live data
  const completedToday = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime).toDateString();
    return sessionDate === new Date().toDateString() && s.status === 'completed';
  }).length;

  const totalHoursToday = sessions
    .filter((s) => new Date(s.startTime).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + (s.durationSeconds || 0) / 3600, 0)
    .toFixed(1);

  const onlineWorkers = workers.filter((w) => w.status === 'active').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Live Dashboard</h1>
        <p className={styles.subtitle}>Real-time overview of field operations.</p>
      </header>

      {/* Stats Row — now pulling from the shared database */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Sessions Today"
          value={String(completedToday)}
          trend="Live"
          isPositive={true}
          icon={Activity}
        />
        <StatCard
          title="Online Staff"
          value={String(onlineWorkers)}
          trend="Live"
          isPositive={true}
          icon={Users}
        />
        <StatCard
          title="Total Hours (Today)"
          value={totalHoursToday}
          trend="Live"
          isPositive={true}
          icon={Clock}
        />
      </div>

      <div className={styles.contentGrid}>
        {/* Map Section (visual placeholder — to be upgraded) */}
        <section className={styles.mapSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Live Map</h3>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#666' }}>
              <span>🟢 Active ({onlineWorkers})</span>
              <span>⚪ Offline ({workers.length - onlineWorkers})</span>
            </div>
          </div>
          <div className={styles.mapContainer}>
            <div style={{ textAlign: 'center', color: '#666' }}>
              <MapPin size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Interactive Map — Coming Soon</p>
              <p style={{ fontSize: '12px' }}>({onlineWorkers} workers active)</p>
            </div>
            {/* Animated worker pins — one per active worker */}
            {workers.filter(w => w.status === 'active').map((worker, i) => (
              <div
                key={worker.id}
                title={`${worker.name} — Active`}
                style={{
                  position: 'absolute',
                  top: `${30 + i * 20}%`,
                  left: `${25 + i * 20}%`,
                  backgroundColor: 'var(--primary)',
                  padding: '8px',
                  borderRadius: '50%',
                  boxShadow: '0 2px 12px rgba(0,227,191,0.5)',
                  cursor: 'pointer',
                  animation: 'pulse 2s infinite',
                }}
              >
                <Users size={16} color="black" />
              </div>
            ))}
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
