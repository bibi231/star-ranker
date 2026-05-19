import { apiGet } from "../../lib/api";

export const createCurrencySlice = (set, get) => ({
    currency: 'USD',
    currencySymbol: '$',
    rates: { USD: 1, NGN: 1500, EUR: 0.92, GBP: 0.79 },
    fetchRates: async () => {
        try {
            const apiRates = await apiGet('/api/currency/rates');
            if (apiRates && apiRates.NGN_USD) {
                const usdToNgn = 1 / apiRates.NGN_USD;
                const usdToEur = usdToNgn * (apiRates.NGN_EUR || 0);
                const usdToGbp = usdToNgn * (apiRates.NGN_GBP || 0);
                set({
                    rates: { USD: 1, NGN: usdToNgn, EUR: usdToEur || 0.92, GBP: usdToGbp || 0.79 }
                });
            }
        } catch (e) {
            console.error('Failed to fetch live rates:', e);
        }
    },
    setCurrency: (code) => {
        const symbols = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
        set({ currency: code, currencySymbol: symbols[code] || '$' });
    },
    parseLocalToUSD: (localVal) => {
        const { currency, rates } = get();
        let num = Number(localVal);
        if (isNaN(num) || !rates[currency]) return 0;
        return num / rates[currency];
    },
    formatValue: (val) => {
        const { currency, rates } = get();
        const num = Number(val) || 0;
        const converted = Math.max(0, num * (rates[currency] || 1));
        const decimals = currency === 'NGN' ? 0 : 2;
        return `★${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
});
