export default function FlightWeatherPanel() {
  return (
    <div className="w-full flex flex-col gap-2 pointer-events-auto shrink-0 z-40">

      {/* Top 2 Cards: Flight Altitude & Coverage Area */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-2.5 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <span className="text-[#a1a1aa] text-[10px] mb-0.5 whitespace-nowrap uppercase tracking-wider font-semibold">Altitude</span>
          <span className="text-white text-lg font-bold mb-0.5">12m</span>
          <span className="text-[#71717a] text-[8px] tracking-wide whitespace-nowrap">Min: 95m</span>
        </div>
        <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-2.5 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <span className="text-[#a1a1aa] text-[10px] mb-0.5 whitespace-nowrap uppercase tracking-wider font-semibold">Coverage</span>
          <span className="text-white text-lg font-bold mb-0.5">250km</span>
          <span className="text-[#71717a] text-[8px] tracking-wide whitespace-nowrap">Dist: 200km</span>
        </div>
      </div>

      {/* Weather Block */}
      <div className="bg-[#18181b]/95 border border-[#c27a3d]/20 rounded-xl p-3 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex flex-col gap-2">

        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm drop-shadow-md">🌤️</span>
          <span className="text-[#e2e8f0] text-xs font-medium tracking-wide">Weather Data</span>
        </div>

        <div className="grid grid-cols-2 gap-2">

          <WeatherCard icon="🌧️" label="Rainfall" value="50mm" />
          <WeatherCard icon="🌡️" label="Temp." value="24°c" />
          <WeatherCard icon="💧" label="Humidity" value="32%" />
          <WeatherCard icon="🌪️" label="Storm" value="1/10" />

        </div>
      </div>
    </div>
  );
}

function WeatherCard({ icon, label, value }) {
  return (
    <div className="bg-[#27272a]/60 border border-white/5 rounded-lg p-2.5 flex flex-col items-start gap-1 transition-colors hover:bg-[#27272a]/80">
      <div className="flex items-center gap-1.5 w-full">
        <div className="w-5 h-5 rounded-full bg-[#18181b] flex items-center justify-center text-[9px] shrink-0 shadow-inner border border-[#3f3f46]/30">
          {icon}
        </div>
        <span className="text-[#a1a1aa] text-[9px] font-medium tracking-wide truncate">{label}</span>
      </div>
      <span className="text-[#e2e8f0] text-sm font-bold tracking-tight mt-1">{value}</span>
    </div>
  );
}
