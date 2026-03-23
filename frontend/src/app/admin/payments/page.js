'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';

const mockPayments = [
  { id: 1, phone: '0712345678', amount: 50, package: '10 Odds', ref: 'RGH9K2X1LM', status: 'matched', time: '2:14 PM' },
  { id: 2, phone: '0723456789', amount: 35, package: null, ref: 'RGH9K2X2LN', status: 'flagged_overpayment', excess: 5, time: '2:18 PM' },
  { id: 3, phone: '0734567890', amount: 30, package: '8 Odds', ref: 'RGH9K2X3LP', status: 'matched', time: '2:22 PM' },
  { id: 4, phone: '0745678901', amount: 10, package: null, ref: 'RGH9K2X4LQ', status: 'flagged_underpayment', time: '2:31 PM' },
  { id: 5, phone: '0756789012', amount: 15, package: '4 Odds', ref: 'RGH9K2X5LR', status: 'matched', time: '2:45 PM' },
  { id: 6, phone: '0767890123', amount: 75, package: null, ref: 'RGH9K2X6LS', status: 'flagged_no_match', time: '3:01 PM' },
];

const statusConfig = {
  matched: { label: 'Matched', color: '#34d399', bg: '#052e1622' },
  flagged_overpayment: { label: 'Overpayment', color: '#f59e0b', bg: '#451a0322' },
  flagged_underpayment: { label: 'Underpayment', color: '#f87171', bg: '#450a0a22' },
  flagged_no_match: { label: 'No Match', color: '#8b5cf6', bg: '#2e1065' + '22' },
};

export default function PaymentsPage() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? mockPayments
    : mockPayments.filter(p => p.status !== 'matched');

  const flagged = mockPayments.filter(p => p.status !== 'matched').length;

  return (
    <>
      <TopBar title="Payments" />
      <div style={{ padding: '24px 32px', maxWidth: '1000px' }}>

        {/* Summary cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '24px',
        }}>
          {[
            { label: 'Total Today', value: mockPayments.length, color: '#3b82f6' },
            { label: 'Matched', value: mockPayments.filter(p => p.status === 'matched').length, color: '#34d399' },
            { label: 'Flagged', value: flagged, color: '#f87171' },
            { label: 'Revenue (KES)', value: mockPayments.filter(p => p.status === 'matched').reduce((s, p) => s + p.amount, 0), color: '#34d399' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'all', label: 'All Payments' },
            { id: 'flagged', label: `Flagged (${flagged})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '6px 16px', border: '1px solid',
                borderColor: filter === t.id ? '#3b82f6' : '#334155',
                borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                background: filter === t.id ? '#1e3a5f' : 'none',
                color: filter === t.id ? '#3b82f6' : '#64748b',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.2fr 80px 1fr 1.5fr 120px 100px',
            gap: '8px', padding: '10px 16px', background: '#0f172a',
            borderRadius: '8px 8px 0 0', borderBottom: '1px solid #334155',
          }}>
            {['Phone', 'Amount', 'Package', 'M-Pesa Ref', 'Status', 'Time'].map(h => (
              <div key={h} style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>

          {filtered.map(p => {
            const cfg = statusConfig[p.status];
            return (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '1.2fr 80px 1fr 1.5fr 120px 100px',
                gap: '8px', padding: '12px 16px',
                borderBottom: '1px solid #1e293b', fontSize: '13px', alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{p.phone}</div>
                <div style={{ color: '#34d399', fontWeight: 600 }}>
                  {p.amount}
                  {p.excess && <span style={{ color: '#f59e0b', fontSize: '11px' }}> (+{p.excess})</span>}
                </div>
                <div style={{ color: p.package ? '#f1f5f9' : '#475569' }}>
                  {p.package ?? '—'}
                </div>
                <div style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>{p.ref}</div>
                <div>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}44`,
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ color: '#475569', fontSize: '12px' }}>{p.time}</div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: '12px', color: '#334155', marginTop: '16px', textAlign: 'center' }}>
          Live M-Pesa integration built in Phase 2. This is sample data for demonstration.
        </p>
      </div>
    </>
  );
}
