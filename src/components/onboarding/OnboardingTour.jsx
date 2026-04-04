import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/storeModel';
import { apiPost } from '../../lib/api';
import { ChevronRight, ChevronLeft, X, Sparkles, Target, Zap, MousePointer2, Briefcase, BarChart2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const TOUR_STEPS = [
    {
        id: 'welcome',
        target: 'header-logo',
        title: 'Welcome to Star Ranker!',
        content: 'The world\'s first ranking prediction market. Predict where items will rank and earn real NGN rewards.',
        icon: <Sparkles className="text-cyan-400" size={18} />,
        position: 'bottom',
        route: null, // stay on current page
    },
    {
        id: 'demo-mode',
        target: 'demo-toggle',
        title: 'Practice with ★50,000',
        content: 'Toggle between Live and Practice mode. We\'ve given you ★50,000 in demo credits to learn the ropes risk-free.',
        icon: <Zap className="text-yellow-400" size={18} />,
        position: 'bottom',
        route: null,
    },
    {
        id: 'markets',
        target: null, // fullscreen step — no target highlight
        title: 'Markets & Rankings',
        content: 'Every 30-minute Epoch, rankings update based on global votes and staking. Browse markets to find items worth predicting.',
        icon: <BarChart2 className="text-cyan-400" size={18} />,
        position: 'center',
        route: '/markets',
    },
    {
        id: 'portfolio',
        target: 'portfolio-stat',
        title: 'Your Command Center',
        content: 'Track your Network Credits, Oracle Rating, and Influence Tier. Place stakes from the Markets page — your results appear here.',
        icon: <Briefcase className="text-emerald-400" size={18} />,
        position: 'bottom',
        route: '/portfolio',
    },
];

export const OnboardingTour = () => {
    const { user, isDemoMode, hasCompletedTour } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [targetRect, setTargetRect] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // Only show if user is logged in, in demo mode, and hasn't finished the tour
    useEffect(() => {
        const localCompleted = localStorage.getItem('sr_tour_completed') === 'true';
        const sessionShown = sessionStorage.getItem('sr_tour_shown') === 'true';
        if (user && isDemoMode && !hasCompletedTour && !localCompleted && !sessionShown) {
            const timer = setTimeout(() => {
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
        if (!step.target) {
            setTargetRect(null);
            return;
        }

        const element = document.querySelector(`[data-tour="${step.target}"]`);
        if (element) {
            setTargetRect(element.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [currentStepIndex]);

    // When step changes, navigate if needed and find target
    useEffect(() => {
        if (currentStepIndex < 0 || currentStepIndex >= TOUR_STEPS.length) return;
        const step = TOUR_STEPS[currentStepIndex];

        // If step requires a specific route, navigate there
        if (step.route && location.pathname !== step.route) {
            setIsNavigating(true);
            navigate(step.route);
            // Wait for the new page to render
            const timer = setTimeout(() => {
                setIsNavigating(false);
                updateTargetRect();
            }, 800);
            return () => clearTimeout(timer);
        }

        // Normal case: try to find the target
        const timer = setTimeout(() => {
            if (step.target) {
                const element = document.querySelector(`[data-tour="${step.target}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            updateTargetRect();
        }, 300);
        return () => clearTimeout(timer);
    }, [currentStepIndex, location.pathname]);

    useEffect(() => {
        const interval = setInterval(updateTargetRect, 100);
        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect, true);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect, true);
        };
    }, [updateTargetRect]);

    const completeTour = async () => {
        setIsVisible(false);
        setCurrentStepIndex(-1);
        localStorage.setItem('sr_tour_completed', 'true');
        await apiPost('/api/demo/tour-complete').catch(console.error);
        useStore.setState({ hasCompletedTour: true });
    };

    const handleNext = async () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < TOUR_STEPS.length) {
            setCurrentStepIndex(nextIndex);
        } else {
            await completeTour();
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
    };

    const handleSkip = async () => {
        await completeTour();
    };

    const calculatePosition = useCallback((target, position) => {
        const popupWidth = 320;
        const popupHeight = 200;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const padding = 16;

        // Center position (for fullscreen steps with no target)
        if (position === 'center' || !target) {
            return { 
                left: Math.max(padding, (windowWidth - popupWidth) / 2), 
                top: Math.max(padding, (windowHeight - popupHeight) / 2), 
                x: 0, y: 0 
            };
        }

        const { left, top, right, bottom, width, height } = target;

        // Mobile: always position below or above
        if (windowWidth < 768) {
            const spaceBelow = windowHeight - bottom;
            if (spaceBelow > 240) {
                return { left: Math.max(padding, (windowWidth - popupWidth) / 2), top: bottom + 12, x: 0, y: 0 };
            } else if (top > 240) {
                return { left: Math.max(padding, (windowWidth - popupWidth) / 2), top: top - popupHeight - 12, x: 0, y: 0 };
            }
            return { left: padding, top: windowHeight - popupHeight - 80, x: 0, y: 0 };
        }

        // Desktop positioning
        let x, y;
        switch (position) {
            case 'bottom':
                x = left + width / 2 - popupWidth / 2;
                y = bottom + padding;
                break;
            case 'top':
                x = left + width / 2 - popupWidth / 2;
                y = top - popupHeight - padding;
                break;
            case 'left':
                x = left - popupWidth - padding;
                y = top + height / 2 - popupHeight / 2;
                break;
            case 'right':
                x = right + padding;
                y = top + height / 2 - popupHeight / 2;
                break;
            default:
                x = windowWidth / 2 - popupWidth / 2;
                y = windowHeight / 2 - popupHeight / 2;
        }

        // Safety clamping
        x = Math.max(padding, Math.min(x, windowWidth - popupWidth - padding));
        y = Math.max(padding, Math.min(y, windowHeight - popupHeight - padding));

        return { left: x, top: y, x: 0, y: 0 };
    }, []);

    const currentStep = TOUR_STEPS[currentStepIndex];
    const pos = currentStep ? calculatePosition(targetRect, currentStep.position) : null;

    if (!isVisible || currentStepIndex < 0 || !currentStep || isNavigating) return null;

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
            {/* Spotlight Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 pointer-events-auto"
                onClick={handleSkip}
                style={{
                    clipPath: targetRect ? `polygon(
                        0% 0%, 0% 100%, 
                        ${targetRect.left - 6}px 100%, 
                        ${targetRect.left - 6}px ${targetRect.top - 6}px, 
                        ${targetRect.right + 6}px ${targetRect.top - 6}px, 
                        ${targetRect.right + 6}px ${targetRect.bottom + 6}px, 
                        ${targetRect.left - 6}px ${targetRect.bottom + 6}px, 
                        ${targetRect.left - 6}px 100%, 
                        100% 100%, 100% 0%
                    )` : undefined
                }}
            />

            {/* Spotlight ring around target */}
            {targetRect && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute rounded-xl border-2 border-[#22d3ee]/60 pointer-events-none"
                    style={{
                        left: targetRect.left - 6,
                        top: targetRect.top - 6,
                        width: targetRect.width + 12,
                        height: targetRect.height + 12,
                        boxShadow: '0 0 30px rgba(34,211,238,0.3), inset 0 0 10px rgba(34,211,238,0.1)',
                    }}
                />
            )}

            {/* Step Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        left: pos?.left,
                        top: pos?.top,
                        transition: { type: 'spring', damping: 25, stiffness: 200 }
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute pointer-events-auto w-[320px] bg-[#0a0a0a] border border-[#22d3ee]/40 rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.15)] overflow-hidden"
                >
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                                    {currentStep.icon}
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                                    {currentStep.title}
                                </h3>
                            </div>
                            <button onClick={handleSkip} className="text-white/20 hover:text-white/50 transition-colors p-1">
                                <X size={14} />
                            </button>
                        </div>

                        <p className="text-[11px] text-white/50 leading-relaxed font-medium mb-5">
                            {currentStep.content}
                        </p>

                        <div className="flex items-center justify-between">
                            {/* Step dots */}
                            <div className="flex gap-1">
                                {TOUR_STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1 rounded-full transition-all duration-300 ${
                                            i === currentStepIndex ? 'w-5 bg-[#22d3ee]' : 
                                            i < currentStepIndex ? 'w-1.5 bg-[#22d3ee]/40' : 'w-1.5 bg-white/10'
                                        }`} 
                                    />
                                ))}
                            </div>

                            {/* Navigation */}
                            <div className="flex gap-2">
                                {currentStepIndex > 0 && (
                                    <button 
                                        onClick={handleBack}
                                        className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white border border-white/5 transition-all"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                )}
                                <button 
                                    onClick={currentStepIndex === TOUR_STEPS.length - 1 ? handleSkip : handleNext}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#22d3ee] text-black font-black text-[10px] uppercase tracking-tight hover:scale-105 active:scale-95 transition-all"
                                >
                                    {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                                    {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={12} strokeWidth={3} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                            transition={{ duration: 0.5 }}
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
