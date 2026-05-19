import { create } from "zustand";
import { createAuthSlice } from './slices/authSlice';
import { createDemoSlice } from './slices/demoSlice';
import { createCurrencySlice } from './slices/currencySlice';
import { createUiSlice } from './slices/uiSlice';
import { createAdminSlice } from './slices/adminSlice';
import { createNotificationsSlice } from './slices/notificationsSlice';
import { createMarketSlice } from './slices/marketSlice';
import { createStakeSlice } from './slices/stakeSlice';

export const useStore = create((set, get) => ({
    ...createAuthSlice(set, get),
    ...createDemoSlice(set, get),
    ...createCurrencySlice(set, get),
    ...createUiSlice(set, get),
    ...createAdminSlice(set, get),
    ...createNotificationsSlice(set, get),
    ...createMarketSlice(set, get),
    ...createStakeSlice(set, get)
}));

if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.useStore = useStore;
}
