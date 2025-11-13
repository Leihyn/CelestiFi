// Quick API test script
const axios = require('axios');

async function testAPI() {
  console.log('\n🧪 Testing DeFi Pulse API Endpoints\n');

  try {
    // Test pools
    console.log('1️⃣ Testing /api/pools...');
    const poolsRes = await axios.get('http://localhost:3001/api/pools');
    console.log(`   ✅ Pools: ${poolsRes.data.data.pools.length} pools found`);
    console.log(`   📊 Sample: ${poolsRes.data.data.pools[0]?.dex} - ${poolsRes.data.data.pools[0]?.token0}/${poolsRes.data.data.pools[0]?.token1}`);

    // Test stats
    console.log('\n2️⃣ Testing /api/stats...');
    const statsRes = await axios.get('http://localhost:3001/api/stats');
    console.log(`   ✅ Stats:`);
    console.log(`   💰 Total TVL: $${statsRes.data.data.totalTVL.toLocaleString()}`);
    console.log(`   📈 24h Volume: $${statsRes.data.data.volume24h.toLocaleString()}`);
    console.log(`   🐋 Whales (24h): ${statsRes.data.data.whaleCount24h}`);

    // Test whales
    console.log('\n3️⃣ Testing /api/whales/recent...');
    const whalesRes = await axios.get('http://localhost:3001/api/whales/recent?limit=5');
    console.log(`   ✅ Whales: ${whalesRes.data.data.whales.length} transactions found`);
    if (whalesRes.data.data.whales[0]) {
      console.log(`   🐳 Largest: $${whalesRes.data.data.whales[0].amountUSD.toLocaleString()}`);
    }

    console.log('\n✅ All API endpoints working!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
  }
}

testAPI();
