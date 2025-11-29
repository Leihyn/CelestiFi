const { createPublicClient, createWalletClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const logger = require('../utils/logger');

// Chain configuration - uses environment variables
const chainId = parseInt(process.env.SOMNIA_CHAIN_ID) || 1;
const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://eth.llamarpc.com';

const somniaChain = defineChain({
  id: chainId,
  name: chainId === 1 ? 'Ethereum' : 'Somnia Dream',
  network: chainId === 1 ? 'mainnet' : 'somnia-dream',
  nativeCurrency: {
    decimals: 18,
    name: chainId === 1 ? 'Ether' : 'STT',
    symbol: chainId === 1 ? 'ETH' : 'STT'
  },
  rpcUrls: {
    default: {
      http: [rpcUrl]
    },
    public: {
      http: [rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: chainId === 1 ? 'Etherscan' : 'Somnia Explorer',
      url: chainId === 1 ? 'https://etherscan.io' : 'https://somnia.explorer.com'
    }
  }
});

// Create public client for read operations
const createSomniaPublicClient = () => {
  try {
    const client = createPublicClient({
      chain: somniaChain,
      transport: http(somniaChain.rpcUrls.default.http[0])
    });
    logger.info('Somnia public client created');
    return client;
  } catch (error) {
    logger.error('Failed to create Somnia public client:', error);
    throw error;
  }
};

// Helper function to get a provider (public client)
const getProvider = () => {
  return createPublicClient({
    chain: somniaChain,
    transport: http(somniaChain.rpcUrls.default.http[0])
  });
};

// Create wallet client for write operations (optional, requires private key)
const createSomniaWalletClient = () => {
  try {
    if (!process.env.PRIVATE_KEY) {
      logger.warn('No PRIVATE_KEY provided, wallet client will not be available');
      return null;
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const client = createWalletClient({
      account,
      chain: somniaChain,
      transport: http(somniaChain.rpcUrls.default.http[0])
    });
    logger.info('Somnia wallet client created');
    return client;
  } catch (error) {
    logger.error('Failed to create Somnia wallet client:', error);
    throw error;
  }
};

module.exports = {
  somniaChain,
  getProvider,
  createSomniaPublicClient,
  createSomniaWalletClient
};
