export const centsToUSD = (amount: number | string | null): number | null => {
  if (!amount) {
    return null;
  }

  return Number(amount) / 100;
};
