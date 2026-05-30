import { useEffect, useRef, useState } from 'react';

/**
 * NetworkSimulation — animated "oracle mesh" visual for Star Ranker.
 * Self-contained canvas (no external deps). Drifting nodes link into an
 * amber consensus web; pulses travel the links; a central core pulses.
 *
 * Controls:
 *   - intensity (10-100): node count + link radius
 *   - speed (1-100): drift + pulse rate
 * Both are live; the component also exposes an optional compact mode.
 *
 * Props:
 *   height   (number, default 360)   canvas height in px
 *   controls (bool, default true)    show the slider controls
 *   intensity/speed (number)         initial values
 */
export default function NetworkSimulation({ height = 360, controls = true, intensity = 62, speed = 48 }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({ nodes: [], pulses: [], running: true, intensity, speed, w: 0, h: 0 });
    const [intensityV, setIntensityV] = useState(intensity);
    const [speedV, setSpeedV] = useState(speed);
    const [running, setRunning] = useState(true);
    const [stats, setStats] = useState({ nodes: 0, links: 0 });

    useEffect(() => { stateRef.current.intensity = intensityV; rebuild(); }, [intensityV]);
    useEffect(() => { stateRef.current.speed = speedV; }, [speedV]);
    useEffect(() => { stateRef.current.running = running; if (running) loopRef.current && loopRef.current(); }, [running]);

    const loopRef = useRef(null);

    function rebuild() {
        const s = stateRef.current;
        const target = Math.round(10 + s.intensity / 100 * 60);
        const n = s.nodes;
        while (n.length < target) n.push({ x: Math.random() * s.w, y: Math.random() * s.h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1.2 + Math.random() * 2.2, h: Math.random() * 100 });
        while (n.length > target) n.pop();
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        const s = stateRef.current;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            s.w = rect.width; s.h = rect.height;
            canvas.width = s.w * DPR; canvas.height = s.h * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        };
        resize(); rebuild();

        let frame = 0, statTick = 0;
        const step = () => {
            const sp = 0.3 + s.speed / 100 * 1.6;
            const radius = 70 + s.intensity / 100 * 60;
            const cx = s.w * 0.5, cy = s.h * 0.5;
            ctx.clearRect(0, 0, s.w, s.h);
            ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, s.w, s.h);

            for (const nd of s.nodes) {
                nd.x += nd.vx * sp; nd.y += nd.vy * sp;
                if (nd.x < 0 || nd.x > s.w) nd.vx *= -1;
                if (nd.y < 0 || nd.y > s.h) nd.vy *= -1;
                nd.h += 0.4 * sp;
            }

            let links = 0;
            for (let a = 0; a < s.nodes.length; a++) {
                for (let b = a + 1; b < s.nodes.length; b++) {
                    const A = s.nodes[a], B = s.nodes[b];
                    const dx = A.x - B.x, dy = A.y - B.y, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < radius) {
                        const o = (1 - d / radius) * 0.45;
                        ctx.strokeStyle = `rgba(245,158,11,${o.toFixed(3)})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
                        links++;
                        if (Math.random() < 0.0008 * sp) s.pulses.push({ ax: a, bx: b, t: 0 });
                    }
                }
            }

            for (let p = s.pulses.length - 1; p >= 0; p--) {
                const pu = s.pulses[p]; pu.t += 0.02 * sp;
                if (pu.t >= 1 || !s.nodes[pu.ax] || !s.nodes[pu.bx]) { s.pulses.splice(p, 1); continue; }
                const A = s.nodes[pu.ax], B = s.nodes[pu.bx];
                const px = A.x + (B.x - A.x) * pu.t, py = A.y + (B.y - A.y) * pu.t;
                ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fillStyle = 'rgba(253,224,71,0.9)'; ctx.fill();
            }

            for (const nd of s.nodes) {
                const tw = 0.5 + 0.5 * Math.sin(nd.h * 0.05);
                const dxc = nd.x - cx, dyc = nd.y - cy, dc = Math.sqrt(dxc * dxc + dyc * dyc);
                ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, 6.283);
                ctx.fillStyle = dc < radius * 0.9
                    ? `rgba(253,224,71,${(0.55 + 0.45 * tw).toFixed(3)})`
                    : `rgba(148,163,184,${(0.35 + 0.4 * tw).toFixed(3)})`;
                ctx.fill();
            }

            const cr = 10 + 4 * Math.sin(Date.now() * 0.002);
            ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.283); ctx.fillStyle = 'rgba(245,158,11,0.14)'; ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 6.283); ctx.fillStyle = '#fbbf24'; ctx.fill();

            if (++statTick % 20 === 0) setStats({ nodes: s.nodes.length, links });
        };

        const loop = () => { if (!s.running) return; step(); frame = requestAnimationFrame(loop); };
        loopRef.current = loop;
        loop();

        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); s.running = false; };
    }, []);

    return (
        <div className="font-sans">
            <div className="relative rounded-2xl overflow-hidden bg-[#020617] border border-amber-500/20" style={{ height }}>
                <canvas ref={canvasRef} className="block w-full h-full" />
                <div className="absolute top-3 left-3.5 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                    ORACLE MESH · LIVE
                </div>
                <div className="absolute bottom-3 right-3.5 font-mono text-[11px] text-slate-500">
                    <span className="text-amber-400">{stats.nodes}</span> nodes · <span className="text-amber-400">{stats.links}</span> links
                </div>
            </div>
            {controls && (
                <div className="flex items-center gap-4 flex-wrap mt-3.5">
                    <label className="flex items-center gap-2.5 flex-1 min-w-[200px] text-sm text-slate-400">
                        Network intensity
                        <input type="range" min="10" max="100" value={intensityV} onChange={e => setIntensityV(+e.target.value)} className="flex-1 accent-amber-500" />
                        <span className="w-6 text-right text-slate-200 font-medium">{intensityV}</span>
                    </label>
                    <label className="flex items-center gap-2.5 flex-1 min-w-[200px] text-sm text-slate-400">
                        Pulse speed
                        <input type="range" min="1" max="100" value={speedV} onChange={e => setSpeedV(+e.target.value)} className="flex-1 accent-amber-500" />
                        <span className="w-6 text-right text-slate-200 font-medium">{speedV}</span>
                    </label>
                    <button onClick={() => setRunning(r => !r)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 active:scale-95 transition">
                        {running ? 'Pause' : 'Play'}
                    </button>
                </div>
            )}
        </div>
    );
}
