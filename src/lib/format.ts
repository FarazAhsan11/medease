const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatFee(amount: number) {
  return currencyFormatter.format(amount);
}

// A tel: link the dialer accepts: digits and a leading plus only.
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
