/**
 * Uniswap V2/V3 style DEX Pool ABI
 * Contains only the events we need to monitor
 */

// Uniswap V2 Pool Events
const UNISWAP_V2_EVENTS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0In', type: 'uint256' },
      { indexed: false, name: 'amount1In', type: 'uint256' },
      { indexed: false, name: 'amount0Out', type: 'uint256' },
      { indexed: false, name: 'amount1Out', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' }
    ],
    name: 'Swap',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' }
    ],
    name: 'Mint',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' }
    ],
    name: 'Burn',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'reserve0', type: 'uint112' },
      { indexed: false, name: 'reserve1', type: 'uint112' }
    ],
    name: 'Sync',
    type: 'event'
  }
];

// Uniswap V3 Pool Events (for future use)
const UNISWAP_V3_EVENTS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount0', type: 'int256' },
      { indexed: false, name: 'amount1', type: 'int256' },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'liquidity', type: 'uint128' },
      { indexed: false, name: 'tick', type: 'int24' }
    ],
    name: 'Swap',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'tickLower', type: 'int24' },
      { indexed: true, name: 'tickUpper', type: 'int24' },
      { indexed: false, name: 'amount', type: 'uint128' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' }
    ],
    name: 'Mint',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'tickLower', type: 'int24' },
      { indexed: true, name: 'tickUpper', type: 'int24' },
      { indexed: false, name: 'amount', type: 'uint128' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' }
    ],
    name: 'Burn',
    type: 'event'
  }
];

// Combined ABI with both V2 and V3 events
const DEX_POOL_ABI = [...UNISWAP_V2_EVENTS, ...UNISWAP_V3_EVENTS];

module.exports = {
  DEX_POOL_ABI,
  UNISWAP_V2_EVENTS,
  UNISWAP_V3_EVENTS
};
