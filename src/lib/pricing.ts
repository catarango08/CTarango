import { loadAll } from './data';
import { fallbackPricing, pricingFromRateBook, type Pricing } from './domain/pricing';

/** Server-side: trip, hour and zone prices from the live Rate Book, with fallbacks. */
export async function loadPricing(): Promise<Pricing> {
  try {
    return pricingFromRateBook(await loadAll('rateBook'));
  } catch {
    return fallbackPricing();
  }
}
