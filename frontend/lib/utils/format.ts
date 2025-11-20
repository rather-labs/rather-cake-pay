/**
 * Format wallet address to shortened form
 * @param address - Full wallet address
 * @param prefixLength - Number of characters to show at start (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Formatted address like "0xabcd...1234"
 */
export function formatAddress(
  address: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!address) return ''
  if (address.length <= prefixLength + suffixLength) return address

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}
