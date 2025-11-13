// Utility Functions
// Formatting helpers for currency, numbers, dates, etc.

// Format large numbers
export const formatUSD = (amount) => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
};

// Format numbers without currency symbol
export const formatNumber = (num) => {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
};

// Format addresses
export const formatAddress = (address) => {
  if (!address || address === 'undefined' || address === 'UNDEFINED' || typeof address !== 'string') {
    return '0x0000...0000';
  }
  if (address.length < 10) return address; // Handle short addresses
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format time ago
export const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Format percentage with color
export const formatPercent = (value) => {
  const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  const color = value >= 0 ? 'text-green-500' : 'text-red-500';
  return { formatted, color };
};

// Determine severity color classes
export const getSeverityColor = (severity) => {
  const colors = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10',
  };
  return colors[severity] || colors.low;
};

// Format token amount with symbol
export const formatTokenAmount = (amount, symbol, decimals = 2) => {
  if (!amount) return `0 ${symbol}`;
  return `${Number(amount).toFixed(decimals)} ${symbol}`;
};

// Format timestamp to readable date
export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

// Format price with appropriate decimals
export const formatPrice = (price) => {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
};

// Get severity from amount
export const getSeverityFromAmount = (amount) => {
  if (amount >= 100000) return 'critical';
  if (amount >= 50000) return 'high';
  if (amount >= 25000) return 'medium';
  return 'low';
};

// Truncate text with ellipsis
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
