import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/storeModel';
import { apiPost } from '../../lib/api';
import { ChevronRight, ChevronLeft, X, Sparkles, Target, Zap, MousePointer2 } from 'lucide-react';

const TOUR_STEPS = [
    {
        id: 'welcome',
        target: 'header-logo',
        title: 'Welcome to Star Ranker!',
        content: 'The world\'s first ranking prediction market. Predict where your favorite items will rank and win real NGN.',
        icon: <Sparkles className="text-cyan-400" />,
        position: 'bottom'
    },
    {
        id: 'demo-mode',
        target: 'demo-toggle',
        title: 'Practice with ₦50k',
        content: 'We\'ve credited your account with ₦50,000 in demo funds. Use them to learn the ropes without risking a kobo.',
        icon: <Zap className="text-yellow-400" />,
        position: 'bottom'
    },
    {
        id: 'ranks',
        target: 'ranking-table',
        title: 'The Real-Time Leaderboard',
        content: 'Every 30 minutes (an Epoch), the rankings update based on global votes. This is what you\'re predicting.',
        icon: <Target className="text-cyan-400" />,
        position: 'top'
    },
    {
        id: 'stake',
        target: 'stake-button',
        title: 'Place Your First Prediction',
        content: 'Find an item you think will move up or down, click Stake, and choose your target rank. Try it now!',
        icon: <MousePointer2 className="text-cyan-400" />,
        position: 'left',
        requireAction: 'stake-placed'
    }
];

export const OnboardingTour = () => {
    const { user, isDemoMode, hasCompletedTour } = useStore();
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [targetRect, setTargetRect] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    // Only show if user is logged in, in demo mode, and hasn't finished the tour
    useEffect(() => {
        const localCompleted = localStorage.getItem('sr_tour_completed') === 'true';
        const sessionShown = sessionStorage.getItem('sr_tour_shown') === 'true';
        if (user && isDemoMode && !hasCompletedTour && !localCompleted && !sessionShown) {
            const timer = setTimeout(() => {
                // Double check state after delay in case profile loaded
                if (!useStore.getState().hasCompletedTour) {
                    sessionStorage.setItem('sr_tour_shown', 'true');
                    setCurrentStepIndex(0);
                    setIsVisible(true);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user, isDemoMode, hasCompletedTour]);

    const updateTargetRect = useCallback(() => {
        if (currentStepIndex < 0 || currentStepIndex >= TOUR_STEPS.length) return;
        
        const step = TOUR_STEPS[currentStepIndex];
        const element = document.querySelector(`[data-tour="${step.target}"]`);
        
        if (element) {
            setTargetRect(element.getBoundingClientRect());
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStepIndex]);

    useEffect(() => {
        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect);
        return () => {
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect);
        };
    }, [updateTargetRect]);

    // Handle external actions to progress tour
    useEffect(() => {
        const handleTourAction = (e) => {
            const step = TOUR_STEPS[currentStepIndex];
            if (step?.requireAction === e.detail.action) {
                handleNext();
            }
        };
        window.addEventListener('sr:tour-action', handleTourAction);
        return () => window.removeEventListener('sr:tour-action', handleTourAction);
    }, [currentStepIndex]);

    const handleNext = async () => {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsVisible(false);
            localStorage.setItem('sr_tour_completed', 'true');
            await apiPost('/api/demo/tour-complete').catch(console.error);
            useStore.setState({ hasCompletedTour: true });
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
    };

    const handleSkip = async () => {
        setIsVisible(false);
        localStorage.setItem('sr_tour_completed', 'true');
        await apiPost('/api/demo/tour-complete').catch(console.error);
        useStore.setState({ hasCompletedTour: true });
    };

    const calculatePosition = useCallback((target, position) => {
        if (!target) return { left: '50%', top: '50%', x: '-50%', y: '-50%' };

        const { left, top, right, bottom, width, height } = target;
        const padding = 20;
        const popupWidth = 320;
        const popupHeight = 180;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let x = left;
        let y = top;
        let xPercent = 0;
        let yPercent = 0;

        // Base positioning
        switch (position) {
            case 'bottom':
                x = left + width / 2 - popupWidth / 2;
                y = bottom + padding / 2;
                break;
            case 'top':
                x = left + width / 2 - popupWidth / 2;
                y = top - popupHeight - padding / 2;
                break;
            case 'left':
                x = left - popupWidth - padding / 2;
                y = top + height / 2 - popupHeight / 2;
                break;
            case 'right':
                x = right + padding / 2;
                y = top + height / 2 - popupHeight / 2;
                break;
            default:
                x = windowWidth / 2 - popupWidth / 2;
                y = windowHeight / 2 - popupHeight / 2;
        }

        // Clamp to viewport
        x = Math.max(padding, Math.min(x, windowWidth - popupWidth - padding));
        y = Math.max(padding, Math.min(y, windowHeight - popupHeight - padding));

        // On very small mobile, just center it at bottom
        if (windowWidth < 480) {
            return {
                left: '50%',
                bottom: 20,
                top: 'auto',
                x: '-50%',
                y: 0
            };
        }

        return { left: x, top: y, x: 0, y: 0 };
    }, []);

    const [pos, setPos] = useState({ left: '50%', top: '50%', x: '-50%', y: '-50%' });
    const currentStep = TOUR_STEPS[currentStepIndex];

    useEffect(() => {
        if (targetRect && currentStep) {
            setPos(calculatePosition(targetRect, currentStep.position));
        }
    }, [targetRect, currentStep, calculatePosition]);

    if (!isVisible || currentStepIndex < 0) return null;

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
            {/* Spotlight Backdrop */}
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 pointer-events-auto"
                    style={{
                        clipPath: targetRect ? `polygon(
                            0% 0%, 0% 100%, 
                            ${targetRect.left}px 100%, 
                            ${targetRect.left}px ${targetRect.top}px, 
                            ${targetRect.right}px ${targetRect.top}px, 
                            ${targetRect.right}px ${targetRect.bottom}px, 
                            ${targetRect.left}px ${targetRect.bottom}px, 
                            ${targetRect.left}px 100%, 
                            100% 100%, 100% 0%
                        )` : 'none'
                    }}
                />
            </AnimatePresence>

            {/* Step Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep.id}
                    layout // Add layout prop for smooth position changes
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        ...pos,
                        transition: { type: 'spring', damping: 25, stiffness: 200 }
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="absolute pointer-events-auto w-[320px] bg-[#0a0a0a] border border-[#22d3ee]/40 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.2)] overflow-hidden"
                >
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                                    {currentStep.icon}
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                                    {currentStep.title}
                                </h3>
                            </div>
                            <button onClick={handleSkip} className="text-white/20 hover:text-white/40 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs text-white/60 leading-relaxed font-medium uppercase tracking-wide mb-6">
                            {currentStep.content}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                                {TOUR_STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-4 bg-[#22d3ee]' : 'w-1 bg-white/10'}`} 
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {currentStepIndex > 0 && (
                                    <button 
                                        onClick={handleBack}
                                        className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white border border-white/5 transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                {!currentStep.requireAction && (
                                    <button 
                                        onClick={handleNext}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22d3ee] text-black font-black text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {currentStepIndex === TOUR_STEPS.length - 1 ? 'Got it!' : 'Next'}
                                        <ChevronRight size={14} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                            className="h-full bg-[#22d3ee]"
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// Helper for other components to progress the tour
export const triggerTourAction = (action) => {
    window.dispatchEvent(new CustomEvent('sr:tour-action', { detail: { action } }));
};
