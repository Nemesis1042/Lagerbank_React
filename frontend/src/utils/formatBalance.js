// Utility function to safely format balance values
export const formatBalance = (balance) => {
  const numericBalance = parseFloat(balance) || 0;
  return numericBalance.toFixed(2);
};

// Utility function to safely get numeric balance
export const getNumericBalance = (balance) => {
  return parseFloat(balance) || 0;
};
