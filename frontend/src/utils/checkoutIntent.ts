/** URL intent contains an identifier only, never trusted prices or payment claims. */
export function checkoutHref(packageId: string): string {
  return `/direct-booking?${new URLSearchParams({ package: packageId })}`;
}
export function requestedCheckoutPackage(search: URLSearchParams): string | undefined {
  const value = search.get('package');
  return value && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : undefined;
}
