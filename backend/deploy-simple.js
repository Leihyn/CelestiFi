/**
 * Simple Token Deployment Script
 * Deploys 6 ERC20 tokens directly to Somnia testnet
 */

import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Simple ERC20 Token Bytecode + ABI
const TOKEN_ABI = [
  "constructor(string memory _name, string memory _symbol, uint256 _initialSupply)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Compile SimpleToken.sol bytecode
const TOKEN_BYTECODE = "0x608060405234801561000f575f80fd5b506040516111c63803806111c683398101604081905261002e91610218565b8251839083906100459060039060208501906100ba565b50805161005990600490602084019061000ba565b50505061007381670de0b6b3a764000061008d60201b60201c565b335f90815260208190526040902055506102fa9050565b5f61009882846102af565b9392505050565b8280546100ab906102c6565b90..."; // Full bytecode here

async function deployToken(wallet, name, symbol, supply) {
  console.log(`\nDeploying ${name} (${symbol})...`);

  try {
    const factory = new ethers.ContractFactory(TOKEN_ABI, TOKEN_BYTECODE, wallet);
    const contract = await factory.deploy(name, symbol, supply);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`  ✅ ${symbol}: ${address}`);

    return { symbol, name, address };
  } catch (error) {
    console.error(`  ❌ Failed to deploy ${symbol}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n🚀 Deploying Tokens to Somnia Testnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('Deployer Address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'STT');

  if (balance === 0n) {
    console.log('\n❌ No testnet tokens! Get tokens first:\n');
    console.log('Visit: https://faucet.somnia.network');
    console.log('Request for:', wallet.address);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Starting Deployments...');
  console.log('='.repeat(60));

  const tokens = [
    { name: 'Wrapped Ether', symbol: 'WETH', supply: '1000' },
    { name: 'USD Coin', symbol: 'USDC', supply: '1000000' },
    { name: 'Tether USD', symbol: 'USDT', supply: '1000000' },
    { name: 'DAI Stablecoin', symbol: 'DAI', supply: '1000000' },
    { name: 'Wrapped Bitcoin', symbol: 'WBTC', supply: '100' },
    { name: 'Somnia Token', symbol: 'SMN', supply: '10000000' },
  ];

  const deployed = {};

  for (const token of tokens) {
    const result = await deployToken(wallet, token.name, token.symbol, token.supply);
    if (result) {
      deployed[result.symbol] = result.address;
    }
    // Wait 2 seconds between deployments
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log('Deployed Token Addresses:\n');
  for (const [symbol, address] of Object.entries(deployed)) {
    console.log(`${symbol}: ${address}`);
  }

  // Save to file
  const output = {
    network: 'Somnia Testnet',
    chainId: 50311,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    tokens: deployed
  };

  fs.writeFileSync('deployed-tokens.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Addresses saved to: deployed-tokens.json');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nVerify on Explorer:');
  console.log(`https://explorer.somnia.network/address/${wallet.address}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
