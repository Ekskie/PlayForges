import React, { useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, AlertCircle, FileText, Filter, Clock, User, Hash } from 'lucide-react';

interface ActivityLogTabProps {
  logs: any[];
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({ logs }) => {
  const [filterAction, setFilterAction] = useState('all');

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return (
          <span className="status-pill" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
            <FileText size={12} /> Ingested
          </span>
        );
      case 'synced_to_shopify':
        return (
          <span className="status-pill is-synced">
            <CheckCircle2 size={12} /> Synced to Storefront
          </span>
        );
      case 'sync_failed':
        return (
          <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
            <AlertCircle size={12} /> Sync Error
          </span>
        );
      case 'evaluated':
        return (
          <span className="status-pill" style={{ background: 'rgba(255, 90, 31, 0.1)', color: '#ff5a1f', borderColor: 'rgba(255, 90, 31, 0.25)' }}>
            <Activity size={12} /> Mesh Evaluated
          </span>
        );
      default:
        return (
          <span className="status-pill is-unsynced">
            <RefreshCw size={12} /> Updated
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div className="section-banner">
        <div>
          <h2 className="section-banner-title">Activity & Audit Trail</h2>
          <p className="section-banner-subtitle">
            Immutable chronological audit log tracking 3D asset ingestions, automated quality scoring, and Shopify metafield synchronizations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px', height: '36px', fontSize: '0.82rem' }}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all">All Actions ({logs.length})</option>
            <option value="synced_to_shopify">Synced to Storefront</option>
            <option value="created">Ingested (Created)</option>
            <option value="evaluated">Quality Evaluated</option>
            <option value="updated">Updated Parameters</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <Clock size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No audit events match the selected filter.</p>
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px 16px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  alignItems: 'flex-start',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getActionBadge(log.action)}
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                        {log.summary}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '8px' }}>
                    {log.details}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={11} />
                      <span>{log.performedBy || 'Admin Merchant'}</span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}>
                      <Hash size={11} />
                      <span>action: <code>{log.action}</code></span>
                    </span>
                    {log.assetId && (
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        Asset ID: #{log.assetId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
