/** URL intent contains an identifier only, never trusted prices or payment claims. */
export function checkoutHref(packageId: string): string {
  return `/student-panel?${new URLSearchParams({ package: packageId, checkout: '1' })}`;
}
export function requestedCheckoutPackage(search: URLSearchParams): string | undefined {
  const value = search.get('package');
  return search.get('checkout') === '1' && value && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : undefined;
}
