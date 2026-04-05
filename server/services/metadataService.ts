import { db } from '../db/index.js';
import { items } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';

/**
 * MetadataService
 * Handles automated fetching of high-quality images and metadata for platform items.
 */
export class MetadataService {
    private static instance: MetadataService;

    private constructor() {}

    public static getInstance(): MetadataService {
        if (!MetadataService.instance) {
            MetadataService.instance = new MetadataService();
        }
        return MetadataService.instance;
    }

    /**
     * Refreshes missing metadata for all items.
     * Prioritizes items without a imageUrl.
     */
    public async refreshAllMissingMetadata() {
        console.log('[MetadataService] Scanning for missing metadata...');
        
        const pendingItems = await db.select().from(items).where(isNull(items.imageUrl));
        
        for (const item of pendingItems) {
            try {
                const imageUrl = await this.fetchImageForItem(item.name, item.category || 'general');
                if (imageUrl) {
                    await db.update(items)
                        .set({ imageUrl })
                        .where(eq(items.id, item.id));
                    console.log(`[MetadataService] Updated ${item.name} with image: ${imageUrl}`);
                }
            } catch (err) {
                console.error(`[MetadataService] Failed to fetch for ${item.name}:`, err);
            }
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Internal logic to resolve an image URL for a given item.
     * Uses curated heuristics and public APIs.
     */
    private async fetchImageForItem(name: string, category: string): Promise<string | null> {
        // 1. Crypto handling (already done by CoinGecko usually, but as fallback)
        if (category === 'crypto' || category === 'token') {
            return `https://assets.coingecko.com/coins/images/placeholder.png`; // Fallback
        }

        // 2. Tech/Company logos (Clearbit is excellent for this)
        const techKeywords = ['apple', 'microsoft', 'google', 'tesla', 'nvidia', 'amazon', 'meta', 'netflix'];
        const foundTech = techKeywords.find(k => name.toLowerCase().includes(k));
        if (foundTech) {
            return `https://logo.clearbit.com/${foundTech}.com`;
        }

        // 3. General Search via Unsplash (Themed)
        const cleanName = encodeURIComponent(name.replace(/\s+/g, '-'));
        const categoryKeywords: Record<string, string> = {
            'sports': 'stadium,athlete,sport',
            'politics': 'government,flag,building',
            'weather': 'clouds,rain,weather',
            'finance': 'stocks,chart,money',
            'entertainment': 'movie,music,stage'
        };
        
        const keywords = categoryKeywords[category] || 'abstract,digital';
        return `https://images.unsplash.com/photo-1614850523296-18c0a4faa43c?auto=format&fit=crop&q=80&w=300&h=300&keyword=${cleanName},${keywords}`;
    }
}
