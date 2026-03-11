import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';

import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
} from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '4ec0c12e2f3d6acdf322f281e601c4cf';

const config = getDefaultConfig({
    appName: 'Star Ranker',
    projectId: PROJECT_ID,
    chains: [mainnet, polygon, optimism, arbitrum, base],
    ssr: false,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#C9A84C',
                        accentColorForeground: '#0D1B2A',
                        borderRadius: 'medium',
                        overlayBlur: 'small',
                    })}
                    coolMode
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
