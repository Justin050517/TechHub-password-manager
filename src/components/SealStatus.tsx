import React, { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui.js/client';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { checkSealApproval, requestSealApproval } from '../utils/sealProtocol';

interface SealStatusProps {
  client: SuiClient | null;
  userRecordsId: string | null;
}

const SealStatus: React.FC<SealStatusProps> = ({ client, userRecordsId }) => {
  const wallet = useWallet();
  const [sealApproved, setSealApproved] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (client && userRecordsId && wallet.connected) {
      checkApprovalStatus();
    }
  }, [client, userRecordsId, wallet.connected]);

  const checkApprovalStatus = async () => {
    if (!client || !userRecordsId) return;
    
    setChecking(true);
    try {
      const approved = await checkSealApproval(client, wallet, userRecordsId);
      setSealApproved(approved);
    } catch (error) {
      console.error('Error checking Seal status:', error);
      setSealApproved(false);
    } finally {
      setChecking(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!client || !userRecordsId) return;
    
    setRequesting(true);
    try {
      const result = await requestSealApproval(client, wallet, userRecordsId);
      if (result.success) {
        setSealApproved(true);
      }
    } catch (error) {
      console.error('Error requesting Seal approval:', error);
    } finally {
      setRequesting(false);
    }
  };

  if (!userRecordsId) {
    return null;
  }

  return (
    <div className="glass-card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
            Seal Protocol Status
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {checking ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                Checking approval status...
              </div>
            ) : sealApproved === null ? (
              'Status unknown'
            ) : sealApproved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)' }}>
                <CheckCircle size={16} />
                Approved - Enhanced security active
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
                <XCircle size={16} />
                Not approved - Basic encryption only
              </div>
            )}
          </div>
        </div>
        
        {sealApproved === false && (
          <button
            className="glass-button primary"
            onClick={handleRequestApproval}
            disabled={requesting}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.8rem',
              cursor: requesting ? 'not-allowed' : 'pointer'
            }}
          >
            {requesting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                Requesting...
              </div>
            ) : (
              <>
                <Shield size={14} />
                Request Approval
              </>
            )}
          </button>
        )}
      </div>
      
      {sealApproved === false && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.75rem', 
          background: 'rgba(255, 193, 7, 0.1)', 
          borderRadius: '6px',
          border: '1px solid rgba(255, 193, 7, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={16} style={{ color: 'var(--accent-yellow)' }} />
            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Enhanced Security Available</span>
          </div>
          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>
            Request Seal approval to enable enhanced encryption and security features for your passwords.
          </p>
        </div>
      )}
    </div>
  );
};

export default SealStatus;
