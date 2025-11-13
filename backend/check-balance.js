/**
 * Check Somnia Testnet Balance
 * Run this to see if you received testnet tokens
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('\n🔍 CHECKING SOMNIA TESTNET...\n');
  console.log('Network:', process.env.SOMNIA_RPC_URL);
  console.log('Your Address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  const balanceETH = ethers.formatEther(balance);

  console.log('\n💰 Balance:', balanceETH, 'STT');

  if (balance > 0n) {
    console.log('\n✅ YOU HAVE TOKENS!');
    console.log('\n📦 Ready to deploy:');
    console.log('npx hardhat run scripts/deploy-tokens.js --network somnia');
  } else {
    console.log('\n❌ No tokens yet');
    console.log('\n📍 GET TESTNET TOKENS:');
    console.log('1. Visit: https://faucet.somnia.network');
    console.log('2. Or Somnia Discord #faucet channel');
    console.log('3. Request tokens for:', wallet.address);
    console.log('\n⏳ Run this script again after requesting tokens');
  }

  console.log('');
}

checkBalance().catch(console.error);
