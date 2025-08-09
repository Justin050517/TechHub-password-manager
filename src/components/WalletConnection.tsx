import React from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Wallet, Shield, Database, Lock } from 'lucide-react';

const WalletConnection: React.FC = () => {
  const wallet = useWallet();

  const handleConnect = async () => {
    try {
      console.log('Attempting to connect wallet...');
      console.log('Available wallets:', wallet.configuredWallets);
      
      // Try to connect to any available wallet
      if (wallet.configuredWallets.length > 0) {
        const firstWallet = wallet.configuredWallets[0];
        console.log('Connecting to:', firstWallet.name);
        await wallet.select(firstWallet.name);
      } else {
        console.log('No wallets configured');
        alert('No Sui wallets found. Please install a Sui wallet extension like Sui Wallet or Suiet Wallet.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet. Please make sure your Sui wallet extension is installed and unlocked.');
    }
  };

  return (
    <div className="wallet-connection">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', flex: 1 }}>
            <Shield size={24} style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>Sui Blockchain</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', flex: 1 }}>
            <Database size={24} style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>Walrus Storage</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', flex: 1 }}>
            <Lock size={24} style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>Seal Encryption</div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Connect Your Wallet</h2>
        <p>
          Connect your Sui wallet to start managing your passwords securely on the blockchain.
          Your passwords are encrypted with Seal protocol and stored on Walrus for maximum security.
        </p>
      </div>

      {/* Debug info */}
      <div className="glass-card" style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <strong>Debug Info:</strong>
        <div>Wallet Status: {wallet.status}</div>
        <div>Connected: {wallet.connected ? 'Yes' : 'No'}</div>
        <div>Connecting: {wallet.connecting ? 'Yes' : 'No'}</div>
        <div>Available Wallets: {wallet.configuredWallets.length}</div>
        {wallet.configuredWallets.map((w, i) => (
          <div key={i}>- {w.name} ({w.installed ? 'installed' : 'not installed'})</div>
        ))}
      </div>

      <button
        className="glass-button primary"
        onClick={handleConnect}
        disabled={wallet.connecting}
        style={{ cursor: wallet.connecting ? 'not-allowed' : 'pointer' }}
      >
        {wallet.connecting ? (
          <div className="loading">
            <div className="spinner"></div>
            Connecting...
          </div>
        ) : (
          <>
            <Wallet size={20} />
            Connect Sui Wallet
          </>
        )}
      </button>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have a Sui wallet? Install{' '}
          <a
            href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
          >
            Sui Wallet
          </a>{' '}
          or{' '}
          <a
            href="https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
          >
            Suiet Wallet
          </a>{' '}
          extension
        </p>
      </div>

      {/* Manual wallet selection buttons */}
      {wallet.configuredWallets.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Or try connecting to a specific wallet:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {wallet.configuredWallets.map((w) => (
              <button
                key={w.name}
                className="glass-button"
                onClick={() => wallet.select(w.name)}
                disabled={!w.installed || wallet.connecting}
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8rem',
                  opacity: w.installed ? 1 : 0.5,
                  cursor: w.installed && !wallet.connecting ? 'pointer' : 'not-allowed'
                }}
              >
                {w.name} {!w.installed && '(Not Installed)'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
