export const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `GH₵ ${n.toLocaleString('en-GH')}`;
};
