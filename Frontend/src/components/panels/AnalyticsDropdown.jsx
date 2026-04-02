import { useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useLocalFires } from '../../hooks/useLocalFires';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function AnalyticsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const local = useLocalFires(); // Fallback to mock data inside if empty

  // Demo data if real data is empty
  const fireData = local.length > 0 ? local : [
    { time: new Date(Date.now() - 3600000 * 20).toISOString(), conf: 0.9 },
    { time: new Date(Date.now() - 3600000 * 18).toISOString(), conf: 0.8 },
    { time: new Date(Date.now() - 3600000 * 15).toISOString(), conf: 0.95 },
    { time: new Date(Date.now() - 3600000 * 10).toISOString(), conf: 0.7 },
    { time: new Date(Date.now() - 3600000 * 5).toISOString(), conf: 0.88 },
    { time: new Date(Date.now() - 3600000 * 2).toISOString(), conf: 0.92 },
  ];

  /* ── 1. Fire Trend Data ── */
  const trendData = (() => {
    // Group into 4-hour buckets for simplicity in this small chart
    const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
    // Mock values rough to the curve in image
    const data = [3, 2, 5, 8, 6, 9, 9];

    return {
      labels,
      datasets: [{
        data,
        borderColor: '#ff3366',
        backgroundColor: 'rgba(255, 51, 102, 0.15)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { grid: { display: false, drawBorder: false }, ticks: { color: '#71717a', font: { size: 9, family: 'monospace' } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#71717a', font: { size: 9, family: 'monospace' }, stepSize: 3, max: 12, min: 0 } }
    }
  };

  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 pointer-events-auto ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'}`}>

      <div className="flex flex-col w-[720px]">
        {/* Toggle Tab */}
        <div className="flex">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[#18181b]/95 border border-b-0 border-[#c27a3d]/20 rounded-t-lg text-white hover:bg-[#27272a] transition-colors shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <span className="text-[#c27a3d]">|ıl</span>
            <span className="font-mono-num text-[11px] font-bold tracking-[0.1em] uppercase">Analytics</span>
            <span className={`text-[10px] text-[#71717a] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

        {/* Panel Content */}
        <div className="glass-panel flex p-6 gap-6 h-[220px] rounded-tl-none border-[#c27a3d]/20 shadow-[0_15px_50px_rgba(0,0,0,0.8)]">

          {/* Section 1: Trend */}
          <div className="flex-1 flex flex-col min-w-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Fire Trend (24h)</h3>
            <div className="flex-1 relative">
              <Line data={trendData} options={chartOptions} />
            </div>
          </div>

          {/* Section 2: Top Clusters */}
          <div className="w-[170px] flex flex-col shrink-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Top Clusters</h3>
            <ul className="flex flex-col gap-3">
              {[
                { name: 'Sierra Nevada', color: '#ef4444' },
                { name: 'Coastal Range', color: '#f59e0b' },
                { name: 'Central Valley', color: '#c27a3d' },
                { name: 'Desert Region', color: '#c27a3d' },
                { name: 'Northern Forest', color: '#71717a' }
              ].map(c => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                  <span className="text-[11px] font-bold text-[#e2e8f0] tracking-wide truncate">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Confidence Dist */}
          <div className="w-[200px] flex flex-col shrink-0">
            <h3 className="font-mono-num text-[10px] text-[#71717a] tracking-widest uppercase mb-4">Confidence Dist.</h3>
            <div className="flex flex-col gap-3 flex-1 justify-center relative -top-2">
              {[
                { label: '90-100%', val: 3, max: 4, color: '#ef4444', num: '4' },
                { label: '80-89%', val: 4, max: 4, color: '#f59e0b', num: '3' },
                { label: '70-79%', val: 3, max: 4, color: '#c27a3d', num: '2' },
                { label: '50-69%', val: 2, max: 4, color: '#71717a', num: '1' }
              ].map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono-num text-[10px] font-bold text-white w-2">{d.num}</span>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-mono-num text-[9px] text-[#71717a]">{d.label}</span>
                    <div className="h-1 bg-[#27272a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(d.val / 4) * 100}%`, backgroundColor: d.color }}></div>
                    </div>
                  </div>
                  <span className="font-mono-num text-[10px] text-white w-2 text-right">{d.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
