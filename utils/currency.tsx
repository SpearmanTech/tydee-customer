export function formatCurrency(value: number | null | undefined) {
  const amount = typeof value === "number" ? value : 0;
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  } catch (e) {
    // Fallback: simple 'R' prefix with two decimals
    return `R${amount.toFixed(2)}`;
  }
}

export default formatCurrency;
