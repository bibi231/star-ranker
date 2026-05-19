import { auth } from "../../firebase";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from "firebase/auth";
import toast from "react-hot-toast";
import { apiGet, apiPost, clearCategoriesCache } from "../../lib/api";
import { isSuperAdminEmail } from "../../lib/superAdmins.js";

export const createUiSlice = (set, get) => ({
    isWithdrawalOpen: false,
    setWithdrawalOpen: (val) => set({ isWithdrawalOpen: val }),
    searchQuery: '',
    isDepositOpen: false,
    setDepositOpen: (val) => set({ isDepositOpen: val }),
    isVotePackModalOpen: false,
    setVotePackModalOpen: (val) => set({ isVotePackModalOpen: val }),
    activeFilter: 'all',
    activeModal: null,
    selectedItem: null,
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    openModal: (modal, item) => set({ activeModal: modal, selectedItem: item }),
    closeModal: () => set({ activeModal: null, selectedItem: null })
});
