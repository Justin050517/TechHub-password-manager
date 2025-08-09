import React from 'react';
import { Eye, Copy, Globe, Lock, Shield, AlertTriangle } from 'lucide-react';

interface PasswordEntry {
  id: string;
  label: string;
  walrusId: string;
  sealApproved?: boolean;
}

interface PasswordListProps {
  passwords: PasswordEntry[];
  onRetrieve: (entry: PasswordEntry) => Promise<void>;
  loading: boolean;
}

const PasswordList: React.FC<PasswordListProps> = ({ passwords, onRetrieve, loading }) => {
  return (
    <div className="password-list">
      {passwords.map((entry, index) => {
        // Add safety checks for undefined values and use proper unique keys
        const safeWalrusId = entry.walrusId || 'unknown';
        const safeLabel = entry.label || `Entry ${index + 1}`;
        const safeId = entry.id || `entry-${index}`;
        const isValidEntry = entry.walrusId && entry.walrusId !== 'unknown';
        const sealApproved = entry.sealApproved || false;

        return (
          <div key={safeId} className="password-entry">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: isValidEntry 
                    ? sealApproved
                      ? 'linear-gradient(135deg, var(--accent-green), #059669)'
                      : 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)'
                    : 'linear-gradient(135deg, #6b7280, #4b5563)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                {sealApproved ? <Shield size={18} /> : <Lock size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0 }}>{safeLabel}</h3>
                  {sealApproved ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '2px 6px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--accent-green)'
                    }}>
                      <Shield size={10} />
                      Seal Approved
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '2px 6px',
                      background: 'rgba(251, 191, 36, 0.2)',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--accent-yellow)'
                    }}>
                      <AlertTriangle size={10} />
                      Basic Encryption
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  Walrus ID: {safeWalrusId.length > 16 ? `${safeWalrusId.substring(0, 16)}...` : safeWalrusId}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onRetrieve(entry)}
              disabled={loading || !isValidEntry}
              className="glass-button primary"
              style={{ 
                width: 'auto', 
                padding: '8px 16px',
                fontSize: '0.9rem',
                opacity: !isValidEntry ? 0.5 : 1
              }}
            >
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <Copy size={14} />
                  {!isValidEntry ? 'Invalid' : 'Copy'}
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PasswordList;
