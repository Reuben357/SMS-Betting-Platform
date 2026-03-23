'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';

// ------------------------------------
// Phase indicator badge
// ------------------------------------
function PhaseBadge({ phase }) {
  const config = {
    1: { label: 'Phase 1 — Live', color: '#34d399', bg: '#052e1622', border: '#166534' },
    2: { label: 'Phase 2 — Coming Soon', color: '#f59e0b', bg: '#451a0322', border: '#92400e' },
    3: { label: 'Phase 3 — Coming Soon', color: '#64748b', bg: '#1e293b', border: '#334155' },
  }[phase];

  return (
    <span style={{
      padding: '2px 8px', borderRadius: '20px', fontSize: '10px',
      fontWeight: 600, background: config.bg, color: config.color,
      border: `1px solid ${config.border}`, whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  );
}

// ------------------------------------
// Metric card
// ------------------------------------
function MetricCard({ label, value, sub, color, phase }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: '8px', padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{label}</span>
        <PhaseBadge phase={phase} />
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color ?? '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real Phase 1 data — contacts count and tier breakdown
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('/api/proxy/contacts?page=1&limit=1');
        if (res.ok) {
          const data = await res.json();
          setLiveData({ totalContacts: data.total });
        }
      } catch (_) {}
      finally { setLoading(false); }
    }
    fetchLive();
  }, []);

  return (
    <>
      <TopBar title="Dashboard" />
      <div style={{ padding: '24px 32px', maxWidth: '1200px' }}>

        {/* Phase 1 — Live data */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Lead Management — Phase 1
          </h2>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '32px',
        }}>
          <MetricCard
            label="Total Contacts"
            value={loading ? '—' : (liveData?.totalContacts ?? 0).toLocaleString()}
            sub="All uploaded CSV contacts"
            color="#3b82f6"
            phase={1}
          />
          <MetricCard
            label="Tier 1 Contacts"
            value="Live"
            sub="1–8 appearances"
            color="#34d399"
            phase={1}
          />
          <MetricCard
            label="Tier 2 Contacts"
            value="Live"
            sub="9–100 appearances"
            color="#8b5cf6"
            phase={1}
          />

          {/* TODO: Make the packages live */}
          <MetricCard
            label="Packages Active"
            value="3"
            sub="KES 15, 30, 50"
            color="#f59e0b"
            phase={1}
          />
        </div>

        {/* Phase 2 — Sample data */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            SMS Commerce — Phase 2
          </h2>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '32px',
        }}>
          {[
            { label: 'Payments Today', value: '—', sub: 'M-Pesa integration in Phase 2', color: '#475569' },
            { label: 'Revenue Today', value: '—', sub: 'KES 0.00', color: '#475569' },
            { label: 'Tips Delivered', value: '—', sub: 'Automated SMS delivery', color: '#475569' },
            { label: 'Flagged Payments', value: '—', sub: 'Requires review', color: '#475569' },
          ].map(m => <MetricCard key={m.label} {...m} phase={2} />)}
        </div>

        {/* Phase 3 — Sample data */}
        <div style={{ marginBottom: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Operations & Reporting — Phase 3
          </h2>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '32px',
        }}>
          {[
            { label: 'Tips Win Rate', value: '—', sub: 'Accuracy tracking', color: '#475569' },
            { label: 'Monthly Revenue', value: '—', sub: 'Inflow vs outflow', color: '#475569' },
            { label: 'Active Customers', value: '—', sub: 'Made at least 1 purchase', color: '#475569' },
            { label: 'Net Profit', value: '—', sub: 'Revenue minus expenses', color: '#475569' },
          ].map(m => <MetricCard key={m.label} {...m} phase={3} />)}
        </div>

        {/* System status */}
        <div style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '8px', padding: '20px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px' }}>
            System Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'Lead Management', status: 'Live', desc: 'CSV upload, tiering, frequency tracking', phase: 1 },
              { label: 'SMS Commerce', status: 'Coming Soon', desc: 'M-Pesa integration, automated tips delivery', phase: 2 },
              { label: 'Tips & Accounting', status: 'Coming Soon', desc: 'Full admin operations and reporting', phase: 3 },
            ].map(item => (
              <div key={item.label} style={{
                background: '#0f172a', borderRadius: '6px',
                padding: '16px', border: '1px solid #334155',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{item.label}</span>
                  <PhaseBadge phase={item.phase} />
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}