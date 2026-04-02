import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

export default function HeatmapPanel({ detectionData, satFires }) {
  const containerRef       = useRef(null);
  const mapRef             = useRef(null);
  const thermalBaseRef     = useRef(null);
  const satBaseRef         = useRef(null);
  const clusterRef         = useRef(null);
  const detMarkerRef       = useRef(null);
  const thermalDivRef      = useRef(null);
  const deckInstanceRef    = useRef(null);
  const maplibreRef        = useRef(null);

  const [mode, setMode]    = useState('thermal'); // 'thermal' | '3d'

  /* ── Init Leaflet map ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Use dark base always initially
    const map = L.map(containerRef.current, { 
      center: [37.774, -122.419], // Defaulting closer to mockup coords
      zoom: 6,
      zoomControl: false // We will handle custom controls if needed, or hide them
    });

    // Dark matter base map
    const thermalBase = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, attribution: '© CARTO' }
    ).addTo(map);

    // World Imagery (Satellite) for 3D normal view
    const satBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Esri' }
    );

    mapRef.current       = map;
    thermalBaseRef.current  = thermalBase;
    satBaseRef.current      = satBase;
    window.firmsMapGlobal   = map;

    // Initialize deck.gl thermal overlay automatically
    if (thermalDivRef.current) thermalDivRef.current.style.display = 'block';
    
    setTimeout(() => {
      map.invalidateSize();
      initThermalOverlay();
    }, 150);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const initThermalOverlay = () => {
    const { deck: deckLib, maplibregl } = window;
    if (!deckLib || !maplibregl || !thermalDivRef.current) return;
    const deckCanvas = thermalDivRef.current.querySelector('#deck-canvas');
    if (!deckCanvas) return;

    const mbMap = new maplibregl.Map({
      container: deckCanvas,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-122.419, 37.774], zoom: 6,
      interactive: false // Let underlying leaflet handle interaction
    });

    mbMap.on('load', () => {
      const overlay = new deckLib.MapboxOverlay({
        layers: [
          new deckLib.HeatmapLayer({
            id: 'heat', data: satFires || [],
            getPosition: d => [d.lon, d.lat],
            getWeight:   d => d.intensity || 300,
            radiusPixels: 80, intensity: 2.5, threshold: 0.05, opacity: 0.8,
            colorRange: [[255,51,102,50],[255,152,0,100],[255,179,0,150],[0,217,255,200],[255,255,255,255]],
          }),
        ],
      });
      mbMap.addControl(overlay);
      deckInstanceRef.current = overlay;

      // Sync deck.gl overlay with leaflet map
      const map = mapRef.current;
      if (map) {
        const syncMap = () => {
          const center = map.getCenter();
          mbMap.jumpTo({
            center: [center.lng, center.lat],
            zoom: map.getZoom() - 1 // deck.gl zoom is roughly leaflet zoom - 1
          });
        };
        map.on('move', syncMap);
        map.on('zoom', syncMap);
      }
    });
    maplibreRef.current = mbMap;
  };

  /* ── Live detection marker ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !detectionData?.fire_detected || !detectionData?.location) return;
    if (detMarkerRef.current) map.removeLayer(detMarkerRef.current);
    const { lat, lon } = detectionData.location;
    
    // Pulsing custom icon for live detection
    const pulsingIcon = L.divIcon({
      html: `<div class="w-4 h-4 rounded-full bg-[#ff3366] shadow-[0_0_20px_rgba(255,51,102,0.8)] animate-pulse-red flex items-center justify-center border-2 border-white"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>`,
      className: '',
      iconSize: L.point(16, 16),
      iconAnchor: [8, 8]
    });

    detMarkerRef.current = L.marker([lat, lon], { icon: pulsingIcon }).addTo(map);
  }, [detectionData]);

  const toggleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === 'thermal') {
      map.removeLayer(thermalBaseRef.current);
      map.addLayer(satBaseRef.current);
      if (thermalDivRef.current) thermalDivRef.current.style.display = 'none';
      setMode('3d');
    } else {
      map.removeLayer(satBaseRef.current);
      map.addLayer(thermalBaseRef.current);
      if (thermalDivRef.current) thermalDivRef.current.style.display = 'block';
      setMode('thermal');
    }
  };

  return (
    <div className="absolute inset-0 z-0 bg-[#0b1120] overflow-hidden pointer-events-auto" style={{ perspective: '1200px' }}>
      
      {/* Dynamic Map Container with pseudo-3D perspective transform */}
      <div 
        className="absolute inset-0 transition-transform duration-1000 ease-in-out origin-center"
        style={{
          transform: mode === '3d' ? 'rotateX(55deg) scale(1.6) translateY(-10%)' : 'rotateX(0deg) scale(1) translateY(0)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Background Grid Pattern Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000"
          style={{ 
            backgroundImage: 'linear-gradient(#00d9ff 1px, transparent 1px), linear-gradient(90deg, #00d9ff 1px, transparent 1px)', 
            backgroundSize: '40px 40px',
            opacity: mode === 'thermal' ? 0.03 : 0
          }}
        ></div>

        {/* Leaflet map base */}
        <div ref={containerRef} className="absolute inset-0 !bg-[#0b1120]" style={{ zIndex: 1 }} />

        {/* Thermal deck.gl overlay */}
        <div ref={thermalDivRef} className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-1000" style={{ display:'none', zIndex: 2 }}>
          <div id="deck-canvas" className="w-full h-full" />
        </div>
      </div>

      {/* Floating Mode Toggle Control */}
      <div className="absolute top-[124px] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1 p-1 bg-[#0a0f1a]/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <button 
          onClick={() => mode !== 'thermal' && toggleMode()} 
          className={`px-5 py-2 text-[10px] font-bold tracking-[0.15em] rounded-lg transition-all duration-300 flex items-center gap-2 ${
            mode === 'thermal' 
              ? 'bg-[#ff3333]/15 text-[#ff3333] border border-[#ff3333]/40 shadow-[0_0_15px_rgba(255,51,51,0.2)]' 
              : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5'
          }`}>
          <span className={mode === 'thermal' ? 'animate-pulse' : ''}>🌡️</span>
          THERMAL
        </button>
        
        <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

        <button 
          onClick={() => mode !== '3d' && toggleMode()} 
          className={`px-5 py-2 text-[10px] font-bold tracking-[0.15em] rounded-lg transition-all duration-300 flex items-center gap-2 ${
            mode === '3d' 
              ? 'bg-[#ff7700]/15 text-[#ff7700] border border-[#ff7700]/40 shadow-[0_0_15px_rgba(255,119,0,0.2)]' 
              : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5'
          }`}>
          <span style={{ transform: mode === '3d' ? 'rotateX(20deg) scale(1.1)' : 'none', transition: 'transform 0.3s' }}>🗺️</span>
          3D NORMAL
        </button>
      </div>

    </div>
  );
}
