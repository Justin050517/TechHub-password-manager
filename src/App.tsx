import React from 'react';
import { WalletProvider } from '@suiet/wallet-kit';
import PasswordManager from './components/PasswordManager';
import './App.css';

function App() {
  return (
    <WalletProvider
      autoConnect={false}
    >
      <div className="app">
        <div className="glass-container">
          <h1>TechHub Web3 Password Manager</h1>
          <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Secure password management using Sui blockchain, Walrus storage, and Seal encryption
          </p>
          <PasswordManager />
        </div>
      </div>
    </WalletProvider>
  );
}

export default App;
