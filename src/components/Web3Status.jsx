import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

export function Web3Status() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
            }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#C9A84C]/20 touch-target"
                                    >
                                        <Wallet size={12} />
                                        Connect Wallet
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-500/20 touch-target"
                                    >
                                        Wrong network
                                    </button>
                                );
                            }

                            return (
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={openChainModal}
                                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                        type="button"
                                    >
                                        {chain.hasIcon && (
                                            <div
                                                style={{
                                                    background: chain.iconBackground,
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: 999,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        style={{ width: 12, height: 12 }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        {chain.name}
                                    </button>

                                    <button
                                        onClick={openAccountModal}
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#C9A84C]/20 touch-target shadow-[0_0_15px_rgba(201,168,76,0.15)]"
                                    >
                                        <Wallet size={12} className="hidden sm:block" />
                                        {account.displayBalance
                                            ? <span className="hidden sm:inline opacity-70">{account.displayBalance}</span>
                                            : ''}
                                        <span className="text-[#C9A84C] ml-1">{account.displayName}</span>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
