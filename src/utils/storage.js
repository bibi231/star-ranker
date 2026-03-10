export const storage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('localStorage is not available (likely iOS Safari Private Mode):', error);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('localStorage is not available to set item:', error);
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('localStorage is not available to remove item:', error);
        }
    }
};
