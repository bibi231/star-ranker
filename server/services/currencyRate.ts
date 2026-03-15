let cachedRates = { NGN_USD: 0.00065, NGN_EUR: 0.00060, NGN_GBP: 0.00052, updatedAt: new Date().toISOString() };

export async function refreshRates() {
    try {
        const res = await fetch('https://open.exchangerate-api.com/v6/latest/NGN');
        const data = await res.json();
        cachedRates = {
            NGN_USD: data.rates?.USD || data.conversion_rates?.USD || cachedRates.NGN_USD,
            NGN_EUR: data.rates?.EUR || data.conversion_rates?.EUR || cachedRates.NGN_EUR,
            NGN_GBP: data.rates?.GBP || data.conversion_rates?.GBP || cachedRates.NGN_GBP,
            updatedAt: new Date().toISOString(),
        };
    } catch (e) {
        console.log('[currency] rate refresh failed, using cached rates');
    }
}

// Initial fetch and interval
refreshRates();
setInterval(refreshRates, 60 * 60 * 1000); // Every 60 minutes

export const getRates = () => cachedRates;
