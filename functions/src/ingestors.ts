import * as admin from 'firebase-admin';

interface ExternalData {
    id: string; // Item UI
    price?: number;
    rank?: number;
    name: string;
}

export async function ingestCryptoData() {
    const db = admin.firestore();

    console.log("Ingesting Crypto Market Data...");

    // In production: const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd...');
    // const data = await response.json();

    const mockExternalData: ExternalData[] = [
        { id: "1", name: "Bitcoin", price: 65000, rank: 1 },
        { id: "2", name: "Ethereum", price: 3500, rank: 2 },
        { id: "3", name: "Solana", price: 145, rank: 5 },
    ];

    for (const entry of mockExternalData) {
        const itemRef = db.collection('items').doc(entry.id);

        await db.runTransaction(async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) return;

            // Normalization: 1% of external price corresponds to 100 ranking points
            // This ensures external drift affects the market but community voting remains the primary driver.
            const externalContribution = (entry.price || 0) * 0.01;

            transaction.update(itemRef, {
                externalBaseline: externalContribution,
                lastIngest: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    }
}

export async function ingestTechData() {
    console.log("Ingesting Tech Market Data (Scraping/API)...");
    // Implementation for retail/spec data ingestion
}
