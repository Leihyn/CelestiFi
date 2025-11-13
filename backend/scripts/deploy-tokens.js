/**
 * Deploy Demo Tokens on Somnia
 * Creates realistic token pairs for your DEX
 */

const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying Demo Tokens to Somnia Mainnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("");

  const Token = await hre.ethers.getContractFactory("SimpleToken");

  // Deploy realistic token pairs
  const tokens = [
    { name: "Wrapped Ether", symbol: "WETH", supply: "1000" },
    { name: "USD Coin", symbol: "USDC", supply: "1000000" },
    { name: "Tether USD", symbol: "USDT", supply: "1000000" },
    { name: "DAI Stablecoin", symbol: "DAI", supply: "1000000" },
    { name: "Wrapped Bitcoin", symbol: "WBTC", supply: "100" },
    { name: "Somnia Token", symbol: "SMN", supply: "10000000" },
  ];

  const deployed = {};

  for (const tokenInfo of tokens) {
    console.log(`Deploying ${tokenInfo.name} (${tokenInfo.symbol})...`);

    const token = await Token.deploy(
      tokenInfo.name,
      tokenInfo.symbol,
      tokenInfo.supply
    );

    await token.waitForDeployment();
    const address = await token.getAddress();

    deployed[tokenInfo.symbol] = address;
    console.log(`  ✅ ${tokenInfo.symbol}: ${address}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60) + "\n");

  console.log("Add these to your backend/.env file:\n");
  for (const [symbol, address] of Object.entries(deployed)) {
    console.log(`${symbol}_ADDRESS=${address}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📝 Next Steps:");
  console.log("=".repeat(60));
  console.log("1. Copy addresses above to backend/.env");
  console.log("2. Find/deploy Uniswap V2 contracts (Factory + Router)");
  console.log("3. Create liquidity pools with these tokens");
  console.log("4. Run discover-pools.js to find your pools");
  console.log("5. Run seed-real-data.js to monitor them");
  console.log("");

  // Save to file for easy reference
  const fs = require('fs');
  fs.writeFileSync(
    'deployed-tokens.json',
    JSON.stringify({ deployed, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log("✅ Addresses saved to: deployed-tokens.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
