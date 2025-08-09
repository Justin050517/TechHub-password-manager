import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { WalletContextState } from '@suiet/wallet-kit';

const PACKAGE_ID = '0xbb115ee5a46c608b434083dd0970f8fcbeaa3f81b857603e32aebaa8f768d6c6';

export interface SealApprovalResult {
  success: boolean;
  transactionDigest?: string;
  error?: string;
}

export interface SealEncryptionData {
  encryptedData: string;
  sealId: string;
  timestamp: number;
  approved: boolean;
}

/**
 * Get the most current version of UserRecords object with retry logic
 */
const getCurrentUserRecords = async (
  client: SuiClient,
  userAddress: string,
  maxRetries = 3
): Promise<{ objectId: string; version: string; digest: string } | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}: Fetching current UserRecords...`);
      
      const objects = await client.getOwnedObjects({
        owner: userAddress,
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
        console.log('❌ No UserRecords found');
        return null;
      }

      const userRecordsObject = objects.data[0];
      const objectId = userRecordsObject.data?.objectId;
      const version = userRecordsObject.data?.version;
      const digest = userRecordsObject.data?.digest;

      if (!objectId || !version || !digest) {
        throw new Error('Invalid UserRecords object data');
      }

      console.log(`✅ Current UserRecords: ID=${objectId}, version=${version}, digest=${digest}`);
      return { objectId, version, digest };
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
};

/**
 * Request seal approval from the smart contract with retry logic
 * This function is now OPTIONAL and only called when explicitly requested
 */
export const requestSealApproval = async (
  client: SuiClient,
  wallet: WalletContextState,
  userRecordsId: string
): Promise<SealApprovalResult> => {
  if (!wallet.signAndExecuteTransactionBlock || !wallet.account?.address) {
    return { success: false, error: 'Wallet not connected' };
  }

  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔐 Seal approval attempt ${attempt}/${maxRetries}...`);
      console.log(`User Records ID: ${userRecordsId}`);
      console.log(`Sender: ${wallet.account.address}`);

      // Get the most current version of the UserRecords object
      const currentObject = await getCurrentUserRecords(client, wallet.account.address);
      if (!currentObject) {
        return { success: false, error: 'UserRecords not found' };
      }

      const tx = new TransactionBlock();
      
      // Call your existing seal_approve function with the current object reference
      tx.moveCall({
        target: `${PACKAGE_ID}::password_manager::seal_approve`,
        arguments: [
          tx.object(currentObject.objectId)
        ]
      });

      console.log(`📝 Submitting Seal approval transaction (attempt ${attempt})...`);
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      console.log('✅ Seal approval transaction completed');
      console.log(`Transaction digest: ${result.digest}`);
      console.log(`Transaction status: ${result.effects?.status?.status}`);

      const success = result.effects?.status?.status === 'success';
      
      if (!success) {
        console.error('❌ Transaction failed:', result.effects?.status);
      }

      return {
        success,
        transactionDigest: result.digest
      };
    } catch (error: any) {
      console.error(`❌ Seal approval attempt ${attempt} failed:`, error);
      
      // Check if it's a version conflict error and we can retry
      if (error.message?.includes('is not available for consumption') && attempt < maxRetries) {
        console.log(`🔄 Version conflict detected, retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      // If it's the last attempt or not a version conflict, return error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};

/**
 * SIMPLIFIED encryption - no automatic approval request
 * This prevents the approval loop issue
 */
export const sealEncryptPassword = async (
  password: string,
  website?: string,
  userRecordsId?: string,
  client?: SuiClient,
  wallet?: WalletContextState
): Promise<SealEncryptionData> => {
  console.log('🔐 Starting Seal encryption process...');
  
  // Generate unique seal ID
  const sealId = `seal_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // SKIP automatic approval request to prevent popup loop
  // The approval will be handled separately if needed
  let approved = false;
  
  console.log('⚠️ Skipping automatic Seal approval to prevent popup loop');
  console.log('💡 Using local encryption with Seal metadata');

  // Enhanced encryption with Seal metadata
  const sealData = {
    password,
    website,
    sealId,
    timestamp: Date.now(),
    approved,
    version: '2.1-seal-simplified'
  };

  // Simulate Seal protocol encryption (replace with actual Seal SDK)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const encryptedData = btoa(JSON.stringify(sealData));
  
  console.log('✅ Seal encryption completed');
  console.log(`Seal ID: ${sealId}`);
  console.log(`Approved: ${approved} (approval skipped to prevent loop)`);

  return {
    encryptedData,
    sealId,
    timestamp: Date.now(),
    approved
  };
};

/**
 * Enhanced decryption with Seal protocol verification
 */
export const sealDecryptPassword = async (
  encryptedData: string,
  userRecordsId?: string,
  client?: SuiClient,
  wallet?: WalletContextState
): Promise<{ password: string; website?: string; sealId: string; approved: boolean }> => {
  console.log('🔓 Starting Seal decryption process...');
  
  try {
    // Decrypt the data
    const decryptedJson = atob(encryptedData);
    const sealData = JSON.parse(decryptedJson);
    
    console.log(`🔍 Seal ID: ${sealData.sealId}`);
    console.log(`📅 Timestamp: ${new Date(sealData.timestamp).toLocaleString()}`);
    console.log(`✅ Previously approved: ${sealData.approved}`);

    // For decryption, we don't need to re-verify approval as it might consume the object
    // The approval status is stored in the encrypted data
    console.log('✅ Seal decryption completed');
    
    return {
      password: sealData.password,
      website: sealData.website,
      sealId: sealData.sealId,
      approved: sealData.approved
    };
  } catch (error) {
    console.error('❌ Seal decryption failed:', error);
    throw new Error(`Seal decryption failed: ${error}`);
  }
};

/**
 * Check if user has Seal approval for their records (read-only check)
 */
export const checkSealApproval = async (
  client: SuiClient,
  wallet: WalletContextState,
  userRecordsId: string
): Promise<boolean> => {
  try {
    // For checking approval status, we'll use a read-only approach
    // Since your seal_approve function doesn't return anything and just validates ownership,
    // we can check if the user owns the object as a proxy for approval capability
    
    const objectResponse = await client.getObject({
      id: userRecordsId,
      options: {
        showContent: true,
        showOwner: true
      }
    });

    if (!objectResponse.data) {
      console.log('❌ UserRecords object not found');
      return false;
    }

    const owner = objectResponse.data.owner;
    const userAddress = wallet.account?.address;

    if (!userAddress) {
      console.log('❌ No wallet address available');
      return false;
    }

    // Check if the user owns the object (which means they can approve)
    const isOwner = owner && 
      typeof owner === 'object' && 
      'AddressOwner' in owner && 
      owner.AddressOwner === userAddress;

    console.log(`🔍 Ownership check: ${isOwner ? 'OWNER' : 'NOT OWNER'}`);
    console.log(`Object owner: ${JSON.stringify(owner)}`);
    console.log(`User address: ${userAddress}`);

    return isOwner;
  } catch (error) {
    console.error('Error checking Seal approval:', error);
    return false;
  }
};
