import React, { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Wallet, Lock, Plus, AlertCircle, Info, CheckCircle } from 'lucide-react';
import WalletConnection from './WalletConnection';
import PasswordForm from './PasswordForm';
import PasswordList from './PasswordList';
import SealStatus from './SealStatus';
import { sealEncryptPassword, sealDecryptPassword } from '../utils/sealProtocol';
import { storeInWalrus, retrieveFromWalrus } from '../utils/crypto';

const PACKAGE_ID = '0xbb115ee5a46c608b434083dd0970f8fcbeaa3f81b857603e32aebaa8f768d6c6';

interface PasswordEntry {
  id: string;
  label: string;
  walrusId: string;
  encryptedData?: string;
  sealApproved?: boolean;
}

interface UserRecords {
  id: string;
  owner: string;
  entries: PasswordEntry[];
  version?: string;
  digest?: string;
}

const PasswordManager: React.FC = () => {
  const wallet = useWallet();
  const [client, setClient] = useState<SuiClient | null>(null);
  const [userRecords, setUserRecords] = useState<UserRecords | null>(null);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  useEffect(() => {
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    setClient(suiClient);
    addDebugLog('Sui client initialized');
  }, []);

  useEffect(() => {
    if (wallet.connected && wallet.account?.address && client) {
      addDebugLog(`Wallet connected: ${wallet.account.address}`);
      checkUserRecords();
    }
  }, [wallet.connected, wallet.account?.address, client]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLog(prev => [...prev.slice(-9), logEntry]);
  };

  const showMessage = (type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    setMessage({ type, text });
    addDebugLog(`Message: ${type} - ${text}`);
    setTimeout(() => setMessage(null), 8000);
  };

  const updateStep = (step: string) => {
    setCurrentStep(step);
    addDebugLog(`Step: ${step}`);
  };

  /**
   * Get the most current version of UserRecords object with retry logic
   */
  const getCurrentUserRecords = async (maxRetries = 3): Promise<{ objectId: string; version: string; digest: string } | null> => {
    if (!client || !wallet.account?.address) return null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        addDebugLog(`Attempt ${attempt}/${maxRetries}: Fetching current user records...`);
        
        const objects = await client.getOwnedObjects({
          owner: wallet.account.address,
          filter: {
            StructType: `${PACKAGE_ID}::password_manager::UserRecords`
          },
          options: {
            showContent: true,
            showType: true,
            showOwner: true
          }
        });

        if (objects.data.length === 0) {
          addDebugLog('No user records found');
          return null;
        }

        const userRecordsObject = objects.data[0];
        const objectId = userRecordsObject.data?.objectId;
        const version = userRecordsObject.data?.version;
        const digest = userRecordsObject.data?.digest;

        if (!objectId || !version || !digest) {
          throw new Error('Invalid user records object data');
        }

        addDebugLog(`Current object: ID=${objectId}, version=${version}, digest=${digest}`);
        return { objectId, version, digest };
      } catch (error) {
        addDebugLog(`Attempt ${attempt} failed: ${error}`);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }
    return null;
  };

  /**
   * Execute blockchain transaction with automatic retry on version conflicts
   */
  const executeTransactionWithRetry = async (
    createTransaction: (objectId: string) => TransactionBlock,
    maxRetries = 5
  ): Promise<any> => {
    if (!wallet.signAndExecuteTransactionBlock) {
      throw new Error('Wallet not connected');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        addDebugLog(`🔄 Transaction attempt ${attempt}/${maxRetries}`);
        
        // Always get fresh object reference before each attempt
        addDebugLog('📋 Fetching fresh object reference...');
        const currentObject = await getCurrentUserRecords();
        if (!currentObject) {
          throw new Error('No user records found');
        }

        addDebugLog(`📋 Using fresh object: ID=${currentObject.objectId}, version=${currentObject.version}`);
        
        // Create transaction with current object
        const tx = createTransaction(currentObject.objectId);
        
        // Execute transaction
        addDebugLog('📤 Executing transaction...');
        const result = await wallet.signAndExecuteTransactionBlock({
          transactionBlock: tx,
          options: {
            showEffects: true,
            showObjectChanges: true
          }
        });

        addDebugLog(`✅ Transaction successful: ${result.digest}`);
        return result;
      } catch (error: any) {
        addDebugLog(`❌ Transaction attempt ${attempt} failed: ${error.message}`);
        
        // Check if it's a version conflict error
        const isVersionConflict = error.message?.includes('is not available for consumption') || 
                                 error.message?.includes('current version');
        
        if (isVersionConflict && attempt < maxRetries) {
          const waitTime = attempt * 2000; // Increased wait time
          addDebugLog(`⏳ Version conflict detected, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If it's the last attempt or not a version conflict, throw the error
        throw error;
      }
    }
  };

  /**
   * Check the actual Seal approval status from encrypted data
   * Skip if Walrus data is not available to avoid blocking the UI
   */
  const checkSealApprovalFromData = async (walrusId: string): Promise<boolean> => {
    try {
      addDebugLog(`🔍 Checking Seal approval status for Walrus ID: ${walrusId}`);
      
      // Retrieve encrypted data from Walrus
      const encryptedData = await retrieveFromWalrus(walrusId);
      
      // Decrypt to check approval status without exposing the password
      const decryptedData = await sealDecryptPassword(encryptedData);
      
      addDebugLog(`✅ Seal approval status: ${decryptedData.approved}`);
      return decryptedData.approved;
    } catch (error) {
      addDebugLog(`⚠️ Skipping Seal approval check for ${walrusId}: ${error}`);
      // Return false but don't block the process
      return false;
    }
  };

  const checkUserRecords = async () => {
    if (!client || !wallet.account?.address) return;

    setLoading(true);
    updateStep('Checking user records...');
    try {
      const objects = await client.getOwnedObjects({
        owner: wallet.account.address,
        filter: {
          StructType: `${PACKAGE_ID}::password_manager::UserRecords`
        },
        options: {
          showContent: true,
          showType: true,
          showOwner: true
        }
      });

      addDebugLog(`Found ${objects.data.length} user record objects`);

      if (objects.data.length > 0) {
        const userRecordsObject = objects.data[0];
        addDebugLog(`Raw user records object: ${JSON.stringify(userRecordsObject, null, 2)}`);
        
        if (userRecordsObject.data?.content && 'fields' in userRecordsObject.data.content) {
          const fields = userRecordsObject.data.content.fields as any;
          addDebugLog(`User records fields: ${JSON.stringify(fields, null, 2)}`);
          
          let processedEntries: PasswordEntry[] = [];
          if (fields.entries && Array.isArray(fields.entries)) {
            // Process entries and check their actual Seal approval status
            for (let index = 0; index < fields.entries.length; index++) {
              const entry = fields.entries[index];
              addDebugLog(`Processing entry ${index}: ${JSON.stringify(entry, null, 2)}`);
              
              const entryFields = entry.fields || entry;
              const entryId = entryFields.id?.id || entryFields.id || `entry-${index}`;
              const entryLabel = entryFields.label || `Entry ${index + 1}`;
              const entryWalrusId = entryFields.walrus_id || entryFields.walrusId || 'unknown';
              
              // Check actual Seal approval status from encrypted data (non-blocking)
              let sealApproved = false;
              if (entryWalrusId && entryWalrusId !== 'unknown') {
                try {
                  sealApproved = await checkSealApprovalFromData(entryWalrusId);
                  addDebugLog(`Entry ${index} Seal status: ${sealApproved}`);
                } catch (error) {
                  addDebugLog(`Skipping Seal status check for entry ${index}: ${error}`);
                }
              }
              
              const processedEntry: PasswordEntry = {
                id: entryId,
                label: entryLabel,
                walrusId: entryWalrusId,
                sealApproved
              };
              
              addDebugLog(`Processed entry ${index}: ${JSON.stringify(processedEntry, null, 2)}`);
              processedEntries.push(processedEntry);
            }
          }
          
          const userRecordsData: UserRecords = {
            id: userRecordsObject.data.objectId,
            owner: fields.owner,
            entries: processedEntries,
            version: userRecordsObject.data.version,
            digest: userRecordsObject.data.digest
          };
          
          setUserRecords(userRecordsData);
          setPasswords(processedEntries);
          
          const approvedCount = processedEntries.filter(e => e.sealApproved).length;
          addDebugLog(`User records loaded with ${processedEntries.length} entries (${approvedCount} Seal approved)`);
          addDebugLog(`Object version: ${userRecordsData.version}, digest: ${userRecordsData.digest}`);
          showMessage('info', `User records loaded: ${processedEntries.length} entries (${approvedCount} Seal approved)`);
        }
      } else {
        addDebugLog('No user records found');
        showMessage('info', 'No user records found. You can create one by adding your first password.');
      }
    } catch (error) {
      console.error('Error checking user records:', error);
      addDebugLog(`Error checking user records: ${error}`);
      showMessage('error', 'Failed to check user records');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const createUserRecords = async () => {
    if (!client || !wallet.account?.address || !wallet.signAndExecuteTransactionBlock) return;

    setLoading(true);
    updateStep('Creating user records...');
    addDebugLog('Creating user records...');
    
    try {
      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::password_manager::create_user_records`,
        arguments: []
      });

      addDebugLog('Submitting create user records transaction...');
      showMessage('warning', '⏳ Please approve the transaction in your wallet to create user records...');
      
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      addDebugLog(`Transaction result: ${result.effects?.status?.status}`);

      if (result.effects?.status?.status === 'success') {
        addDebugLog('User records created successfully');
        showMessage('success', 'User records created successfully!');
        // Wait a bit for the transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkUserRecords();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error creating user records:', error);
      addDebugLog(`Error creating user records: ${error}`);
      
      // Handle specific wallet rejection error
      if (error.message?.includes('User rejection') || error.message?.includes('UserRejectionError')) {
        showMessage('warning', '❌ Transaction was cancelled. You need to approve the transaction in your wallet to create user records and save passwords.');
      } else if (error.message?.includes('Insufficient funds')) {
        showMessage('error', '💰 Insufficient SUI tokens. Please add some SUI to your wallet to pay for transaction fees.');
      } else {
        showMessage('error', `Failed to create user records: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const savePassword = async (label: string, password: string, website?: string) => {
    if (!client || !wallet.account?.address || !wallet.signAndExecuteTransactionBlock) {
      addDebugLog('Missing required components for save operation');
      showMessage('error', 'Wallet not properly connected');
      return;
    }

    setLoading(true);
    addDebugLog(`Starting SIMPLIFIED password save process for label: "${label}"`);
    
    try {
      // Step 1: Encrypt password using SIMPLIFIED Seal protocol (no approval popup)
      updateStep('Encrypting password...');
      addDebugLog('Step 1: Starting SIMPLIFIED Seal encryption (no approval popup)...');
      const sealData = await sealEncryptPassword(
        password, 
        website, 
        userRecords?.id, 
        client, 
        wallet
      );
      addDebugLog(`Step 1 Complete: Seal encryption successful. Approved: ${sealData.approved}`);
      
      // Step 2: Store encrypted data in Walrus
      updateStep('Storing in Walrus...');
      addDebugLog('Step 2: Starting Walrus storage...');
      const walrusId = await storeInWalrus(sealData.encryptedData);
      addDebugLog(`Step 2 Complete: Walrus storage successful. ID: ${walrusId}`);
      
      // Step 3: Check if user records exist, create if needed
      if (!userRecords) {
        updateStep('Creating user records...');
        addDebugLog('Step 3a: No user records found, creating new ones...');
        showMessage('info', '🔧 Creating user records first. Please approve the transaction in your wallet...');
        
        await createUserRecords();
        
        // Wait longer for transaction to be processed and check again
        await new Promise(resolve => setTimeout(resolve, 4000));
        await checkUserRecords();
        
        // Check if we still don't have user records after creation attempt
        if (!userRecords) {
          addDebugLog('Step 3b: FAILED - Still no user records after creation attempt');
          throw new Error('Failed to create user records. Please try again and make sure to approve the wallet transaction.');
        }
      }

      addDebugLog(`Step 3 Complete: Using user records ID: ${userRecords.id}`);

      // Step 4: Save to blockchain using retry mechanism
      updateStep('Saving to blockchain...');
      addDebugLog('Step 4: Starting blockchain transaction with enhanced retry mechanism...');
      showMessage('warning', '⏳ Please approve the password save transaction in your wallet...');
      
      const result = await executeTransactionWithRetry((objectId: string) => {
        const tx = new TransactionBlock();
        tx.moveCall({
          target: `${PACKAGE_ID}::password_manager::save_entry`,
          arguments: [
            tx.object(objectId),
            tx.pure.string(label),
            tx.pure.string(walrusId)
          ]
        });
        return tx;
      });

      const isSuccess = result.effects?.status?.status === 'success' || result.digest;
      
      if (isSuccess) {
        updateStep('Password saved successfully!');
        addDebugLog('Step 4 Complete: Password saved successfully!');
        showMessage('success', `✅ Password "${label}" saved successfully! 🔐 Encrypted with Seal protocol`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkUserRecords();
        setShowPasswordForm(false);
      } else {
        throw new Error(`Transaction failed with status: ${result.effects?.status?.status}`);
      }
    } catch (error: any) {
      console.error('SAVE PASSWORD ERROR:', error);
      addDebugLog(`SAVE ERROR: ${error}`);
      
      // Handle specific wallet rejection error
      if (error.message?.includes('User rejection') || error.message?.includes('UserRejectionError')) {
        showMessage('warning', '❌ Transaction was cancelled. You need to approve the transaction in your wallet to save the password to the blockchain.');
      } else if (error.message?.includes('Insufficient funds')) {
        showMessage('error', '💰 Insufficient SUI tokens. Please add some SUI to your wallet to pay for transaction fees.');
      } else {
        showMessage('error', `Failed to save password: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const retrievePassword = async (entry: PasswordEntry) => {
    try {
      setLoading(true);
      updateStep(`Retrieving password for ${entry.label}...`);
      addDebugLog(`Retrieving password with Seal protocol for: ${entry.label}`);
      
      // Retrieve encrypted data from Walrus
      const encryptedData = await retrieveFromWalrus(entry.walrusId);
      addDebugLog('Data retrieved from Walrus');
      
      // Decrypt password using Seal protocol
      const decryptedData = await sealDecryptPassword(
        encryptedData,
        userRecords?.id,
        client,
        wallet
      );
      addDebugLog(`Password decrypted successfully. Seal approved: ${decryptedData.approved}`);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(decryptedData.password);
      showMessage('success', `Password copied to clipboard! ${decryptedData.approved ? '🔐 Seal verified' : '⚠️ Basic decryption'}`);
    } catch (error) {
      console.error('Error retrieving password:', error);
      addDebugLog(`Retrieve error: ${error}`);
      showMessage('error', 'Failed to retrieve password');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  if (!wallet.connected) {
    return <WalletConnection />;
  }

  return (
    <div className="password-manager">
      <div className="wallet-info">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <Wallet size={20} />
          <span>Connected Wallet</span>
        </div>
        <div className="wallet-address">
          {wallet.account?.address}
        </div>
      </div>

      {/* Seal Protocol Status */}
      <SealStatus client={client} userRecordsId={userRecords?.id || null} />

      {/* Current Step Indicator */}
      {currentStep && (
        <div className="glass-card" style={{ 
          background: 'rgba(0, 123, 255, 0.1)', 
          border: '1px solid rgba(0, 123, 255, 0.3)',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
            <span style={{ color: '#007bff', fontWeight: '500' }}>{currentStep}</span>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ 
          cursor: 'pointer', 
          padding: '8px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          Debug Log ({debugLog.length} entries)
        </summary>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '12px', 
          borderRadius: '8px', 
          marginTop: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontSize: '0.8rem',
          fontFamily: 'monospace'
        }}>
          {debugLog.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {log}
            </div>
          ))}
        </div>
      </details>

      {message && (
        <div className={`status-message status-${message.type}`}>
          {message.text}
        </div>
      )}

      {!showPasswordForm ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Your Passwords</h2>
            <button
              className="glass-button primary"
              onClick={() => setShowPasswordForm(true)}
              style={{ width: 'auto', padding: '8px 16px' }}
              disabled={loading}
            >
              <Plus size={16} />
              Add Password
            </button>
          </div>

          <PasswordList
            passwords={passwords}
            onRetrieve={retrievePassword}
            loading={loading}
          />

          {passwords.length === 0 && !loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <Lock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
              <h3>No passwords saved yet</h3>
              <p>Add your first password to get started with secure Web3 storage powered by Seal protocol.</p>
              <div style={{ 
                background: 'rgba(0, 123, 255, 0.1)', 
                border: '1px solid rgba(0, 123, 255, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#007bff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} />
                  Simplified Save Process
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  We've simplified the password saving process! Now you only need to approve ONE transaction to save your password.
                  No more approval loops - just encrypt, store, and save to blockchain in one smooth flow.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <PasswordForm
          onSave={savePassword}
          onCancel={() => setShowPasswordForm(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default PasswordManager;
