'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';

const mockInflow = [
  { phone: '0712345678', amount: 50, package: '10 Odds', ref: 'RGH9K2X1LM', time: '2:14 PM' },
  { phone: '0734567890', amount: 30, package: '8 Odds', ref: 'RGH9K2X3LP', time: '2:22 PM' },
  { phone: '0756789012', amount: 15, package: '4 Odds', ref: 'RGH9K2X5LR', time: '2:45 PM' },
  { phone: '0789012345', amount: 50, package: '10 Odds', ref: 'RGH9K2X7LT', time: '3:10 PM' },
  { phone: '0701234567', amount: 30, package: '8 Odds', ref: 'RGH9K2X8LU', time: '3:28 PM' },
];

const mockOutflow = [
  { description: 'DigitalOcean VPS', category: 'VPS', amount: 2500, date: '1 Mar 2026' },
  { description: 'OnfonMedia SMS Credits', category: 'SMS Gateway', amount: 1200, date: '5 Mar 2026' },
  { description: 'Domain renewal', category: 'Domain', amount: 800, date: '10 Mar 2026' },
];

const mockFlagged = [
  { phone: '0723456789', amount: 35, reason: 'Overpayment — KES 5 excess', ref: 'RGH9K2X2LN', resolved: false },
  { phone: '0745678901', amount: 10, reason: 'Below minimum (KES 15)', ref: 'RGH9K2X4LQ', resolved: false },
  { phone: '0767890123', amount: 75, reason: 'No matching package', ref: 'RGH9K2X6LS', resolved: true },
];

export default function AccountingPage() {
  const [tab, setTab] = useState('inflow');
  const [outflowForm, setOutflowForm] = useState({ description: '', category: 'VPS', amount: '' });

  const totalInflow = mockInflow.reduce((s, r) => s + r.amount, 0);
  const totalOutflow = mockOutflow.reduce((s, r) => s + r.amount, 0);
  const net = totalInflow - totalOutflow;
  const unresolved = mockFlagged.filter(f => !f.resolved).length;

  const inputStyle = {
    padding: '8px 10px', border: '1px solid #475569', borderRadius: '4px',
    fontSize: '13px', background: '#0f172a', color: '#f1f5f9',
  };

  return (
    <>
      <TopBar title="Accounting" />
      <div style={{ padding: '24px 32px', maxWidth: '1000px' }}>

        {/* Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px', marginBottom: '24px',
        }}>
          {[
            { label: 'Total Inflow', value: `KES ${totalInflow.toLocaleString()}`, color: '#34d399' },
            { label: 'Total Outflow', value: `KES ${totalOutflow.toLocaleString()}`, color: '#f87171' },
            { label: 'Net', value: `KES ${net.toLocaleString()}`, color: net >= 0 ? '#34d399' : '#f87171' },
            { label: 'Flagged Payments', value: unresolved, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '8px', padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #334155' }}>
          {[
            { id: 'inflow', label: 'Inflow' },
            { id: 'outflow', label: 'Outflow' },
            { id: 'flagged', label: `Flagged (${unresolved})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '13px',
              color: tab === t.id ? '#3b82f6' : '#64748b',
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Inflow */}
        {tab === 'inflow' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.2fr 80px 1fr 1.5fr 80px',
              gap: '8px', padding: '10px 16px', background: '#0f172a',
              borderRadius: '8px 8px 0 0', borderBottom: '1px solid #334155',
            }}>
              {['Phone', 'Amount', 'Package', 'M-Pesa Ref', 'Time'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {mockInflow.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.2fr 80px 1fr 1.5fr 80px',
                gap: '8px', padding: '11px 16px', fontSize: '13px',
                borderBottom: '1px solid #1e293b', alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{r.phone}</div>
                <div style={{ color: '#34d399', fontWeight: 600 }}>{r.amount}</div>
                <div style={{ color: '#f1f5f9' }}>{r.package}</div>
                <div style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '12px' }}>{r.ref}</div>
                <div style={{ color: '#475569', fontSize: '12px' }}>{r.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* Outflow */}
        {tab === 'outflow' && (
          <div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '14px' }}>Add Expense</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Description</label>
                  <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    placeholder="e.g. OnfonMedia SMS Credits"
                    value={outflowForm.description}
                    onChange={e => setOutflowForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
                  <select style={{ ...inputStyle, width: '100%' }}
                    value={outflowForm.category}
                    onChange={e => setOutflowForm(f => ({ ...f, category: e.target.value }))}>
                    <option>VPS</option>
                    <option>SMS Gateway</option>
                    <option>Domain</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Amount (KES)</label>
                  <input type="number" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    placeholder="0"
                    value={outflowForm.amount}
                    onChange={e => setOutflowForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <button style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  Add
                </button>
              </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 100px 100px',
                gap: '8px', padding: '10px 16px', background: '#0f172a',
                borderRadius: '8px 8px 0 0', borderBottom: '1px solid #334155',
              }}>
                {['Description', 'Category', 'Amount', 'Date'].map(h => (
                  <div key={h} style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {mockOutflow.map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 100px 100px',
                  gap: '8px', padding: '11px 16px', fontSize: '13px',
                  borderBottom: '1px solid #1e293b', alignItems: 'center',
                }}>
                  <div style={{ color: '#f1f5f9' }}>{r.description}</div>
                  <div>
                    <span style={{ padding: '2px 8px', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>
                      {r.category}
                    </span>
                  </div>
                  <div style={{ color: '#f87171', fontWeight: 600 }}>{r.amount.toLocaleString()}</div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>{r.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagged */}
        {tab === 'flagged' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.2fr 80px 2fr 1.5fr 100px 80px',
              gap: '8px', padding: '10px 16px', background: '#0f172a',
              borderRadius: '8px 8px 0 0', borderBottom: '1px solid #334155',
            }}>
              {['Phone', 'Amount', 'Reason', 'Ref', 'Status', ''].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {mockFlagged.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.2fr 80px 2fr 1.5fr 100px 80px',
                gap: '8px', padding: '11px 16px', fontSize: '13px',
                borderBottom: '1px solid #1e293b', alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{r.phone}</div>
                <div style={{ color: '#f59e0b', fontWeight: 600 }}>{r.amount}</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>{r.reason}</div>
                <div style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>{r.ref}</div>
                <div>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: r.resolved ? '#052e1622' : '#450a0a22',
                    color: r.resolved ? '#34d399' : '#f87171',
                    border: `1px solid ${r.resolved ? '#166534' : '#991b1b'}`,
                  }}>
                    {r.resolved ? 'Resolved' : 'Pending'}
                  </span>
                </div>
                <div>
                  {!r.resolved && (
                    <button style={{
                      padding: '3px 10px', background: 'none',
                      border: '1px solid #475569', borderRadius: '4px',
                      color: '#94a3b8', cursor: 'pointer', fontSize: '11px',
                    }}>
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#334155', marginTop: '16px', textAlign: 'center' }}>
          Live M-Pesa data integrated in Phase 2. Showing sample data for demonstration.
        </p>
      </div>
    </>
  );
}
