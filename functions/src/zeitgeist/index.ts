/**
 * Zeitgeist Module Index
 * 
 * Exports all ZMG functions for use in main index.ts
 */

// Main runner functions
export {
    zeitgeistRunner,
    triggerZMG,
    getZMGRuns,
    getZMGStats
} from "./runner";

// Scorer (for potential direct use)
export {
    calculateZeitgeistScore,
    calculateDecay,
    MARKET_WEIGHTS
} from "./scorer";
