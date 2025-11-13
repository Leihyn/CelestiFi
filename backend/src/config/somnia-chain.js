const { createPublicClient, createWalletClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const logger = require('../utils/logger');

// Somnia Dream Chain configuration using defineChain
const somniaChain = defineChain({
  id: 50312,
  name: 'Somnia Dream',
  network: 'somnia-dream',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT'
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network']
    },
    public: {
      http: ['https://dream-rpc.somnia.network']
    }
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia.explorer.com'
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
