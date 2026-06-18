import type { SourceAdapter } from '../lib/types';
import { bolAdapter } from './bol';
import { affiliateFeedAdapters } from './affiliate-feed';
// amazonAdapter bewust niet geimporteerd in ACTIVE_ADAPTERS: zie src/adapters/amazon.ts
// voor waarom (PA-API vereist kwalificerende sales). Importeer en voeg toe
// zodra die toegang er is.

/**
 * Registry van actieve bronnen. Eén bron toevoegen = één regel hier
 * (en voor drogist-feeds: één entry in FEED_CONFIGS in affiliate-feed.ts).
 */
export const ACTIVE_ADAPTERS: SourceAdapter[] = [bolAdapter, ...affiliateFeedAdapters];
