import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart2, Activity, Award, User } from 'lucide-react';

const tabs = [
    { label: 'Markets', icon: BarChart2, path: '/markets' },
    { label: 'Activity', icon: Activity, path: '/activity' },
    { label: 'Rankings', icon: Award, path: '/leaderboards' },
    { label: 'Portfolio', icon: User, path: '/portfolio' },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav
            className='fixed bottom-0 left-0 right-0 z-50 md:hidden
                 bg-[#0D1B2A] border-t border-[#C9A84C]/30
                 flex items-stretch'
            style={{ paddingBottom: 'var(--safe-bottom)' }}
        >
            {tabs.map(({ label, icon: Icon, path }) => {
                const active = location.pathname === path;
                return (
                    <button key={path}
                        onClick={() => navigate(path)}
                        className={`flex-1 flex flex-col items-center justify-center
                        py-3 gap-1 min-h-[56px] transition-colors
                        ${active ? 'text-[#C9A84C]' : 'text-gray-400 active:text-white'}`}
                    >
                        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                        <span className='text-[10px] font-medium tracking-wide'>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
