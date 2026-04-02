import { useLocalFires } from '../../hooks/useLocalFires';

export default function LiveDetectionsPanel() {
  const localFiresRaw = useLocalFires();

  // Sort by time, most recent first, take top 10 or pad with mock data if needed
  const detections = localFiresRaw.length > 0
    ? [...localFiresRaw].reverse().slice(0, 10)
    : [
      { id: 'F-003', lat: 34.052, lon: -118.244, conf: 0.97, timeElapsed: '00:12:34', color: '#ff3366' },
      { id: 'F-001', lat: 36.778, lon: -119.418, conf: 0.92, timeElapsed: '00:08:12', color: '#ff3366' },
      { id: 'F-008', lat: 37.774, lon: -122.419, conf: 0.88, timeElapsed: '00:15:47', color: '#ff9800' },
      { id: 'F-012', lat: 33.942, lon: -118.408, conf: 0.85, timeElapsed: '00:21:03', color: '#ff9800' },
      { id: 'F-005', lat: 35.373, lon: -119.818, conf: 0.78, timeElapsed: '00:29:55', color: '#ff9800' },
      { id: 'F-002', lat: 38.581, lon: -121.494, conf: 0.72, timeElapsed: '00:34:18', color: '#00d9ff' },
      { id: 'F-010', lat: 32.715, lon: -117.161, conf: 0.65, timeElapsed: '00:41:22', color: '#00d9ff' },
      { id: 'F-004', lat: 39.739, lon: -104.990, conf: 0.58, timeElapsed: '00:48:09', color: '#00d9ff' },
    ];

  // Map real data to display schema if not using mock
  const displayList = localFiresRaw.length > 0 ? detections.map((d, i) => {
    const elapsedMs = Date.now() - new Date(d.time).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const confScore = d.confidence || d.conf || 0;

    return {
      id: `F-${String(localFiresRaw.length - i).padStart(3, '0')}`,
      lat: d.lat || 0,
      lon: d.lon || 0,
      conf: confScore,
      timeElapsed: `00:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      color: confScore > 0.85 ? '#ff3366' : confScore > 0.75 ? '#ff9800' : '#ff7700'
    };
  }) : detections;

  return (
    <div className="absolute top-[68px] right-6 w-[280px] bottom-[260px] z-60 flex pointer-events-none">

      {/* List Container */}
      <div className="w-full flex flex-col overflow-hidden pointer-events-auto bg-[#18181b]/70 backdrop-blur-2xl border border-[#3f3f46]/30 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="px-5 py-4 border-b border-[#3f3f46]/30 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse-red"></div>
            <span className="font-mono-num text-[11px] font-bold text-[#e2e8f0] tracking-widest uppercase truncate">
              Live Detections
            </span>
          </div>
          <span className="font-mono-num text-[10px] text-[#c27a3d] font-bold mt-px">
            {localFiresRaw.length} active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-8 custom-scrollbar min-h-0 flex flex-col gap-2">
          {displayList.map((item, i) => (
            <DetectionItem key={i} {...item} />
          ))}
        </div>
      </div>

    </div>
  );
}

function DetectionItem({ id, lat, lon, conf, timeElapsed, color }) {
  const confPercent = Math.round(conf * 100);

  return (
    <div className="group flex flex-col gap-2 px-4 py-4 rounded-xl border border-white/5 bg-[#27272a]/40 hover:bg-[#27272a]/60 transition-all cursor-pointer relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: color }}></div>

      <div className="flex justify-between items-center pl-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="font-heading font-bold text-white text-[14px] tracking-wide leading-tight">{id}</span>
        </div>
        <span className="font-mono-num text-[11px] text-white/50 font-medium">{timeElapsed}</span>
      </div>

      <div className="flex justify-between items-center pl-4">
        <span className="font-mono-num text-[11px] text-white/40 leading-none">
          ⌖ {Math.abs(lat).toFixed(3)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lon).toFixed(3)}°{lon >= 0 ? 'E' : 'W'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-heading font-bold text-[12px]" style={{ color }}>{confPercent}%</span>
          <span className="text-white/20 text-[10px]">&gt;</span>
        </div>
      </div>

    </div>
  );
}
