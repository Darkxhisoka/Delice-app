import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Clock, TrendingDown, TrendingUp, Calendar, Zap, AlertCircle, Info } from 'lucide-react';

export interface RoomProductionTimeD3ChartProps {
  roomId: string;
  roomName: string;
  categoryFr?: string;
  totalUnitsToday?: number;
  accentColor?: string; // Hex color for D3 path & gradient
}

interface DailyProductionData {
  date: Date;
  dateStr: string;
  dayLabel: string;
  avgMinutes: number;
  batchCount: number;
  unitsProduced: number;
  timePerUnitSeconds: number;
}

// Room base characteristics (minutes per batch run & seconds per unit)
const ROOM_BASE_DURATIONS: Record<
  string,
  { baseMinutes: number; variance: number; secPerUnit: number; hexColor: string }
> = {
  patisseries_fines: { baseMinutes: 95, variance: 18, secPerUnit: 42, hexColor: '#f59e0b' }, // Amber
  viennoiserie: { baseMinutes: 160, variance: 22, secPerUnit: 30, hexColor: '#d97706' }, // Amber-600
  gateaux_secs: { baseMinutes: 48, variance: 9, secPerUnit: 18, hexColor: '#ea580c' }, // Orange
  gateaux_orientaux: { baseMinutes: 110, variance: 16, secPerUnit: 48, hexColor: '#e11d48' }, // Rose
  feuilletage: { baseMinutes: 140, variance: 20, secPerUnit: 35, hexColor: '#059669' }, // Emerald
  piece_montee: { baseMinutes: 215, variance: 35, secPerUnit: 90, hexColor: '#7c3aed' }, // Violet
  trompe_oeil: { baseMinutes: 180, variance: 28, secPerUnit: 75, hexColor: '#0284c7' }, // Sky
};

/**
 * Deterministic pseudo-random generator based on roomId and day offset
 * Ensures chart is consistent across re-renders for the same day
 */
function generateDeterministic30DaysData(roomId: string): DailyProductionData[] {
  const config = ROOM_BASE_DURATIONS[roomId] || {
    baseMinutes: 80,
    variance: 15,
    secPerUnit: 35,
    hexColor: '#3b82f6',
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data: DailyProductionData[] = [];

  // Seed base on room string char codes
  let seed = 0;
  for (let i = 0; i < roomId.length; i++) {
    seed = (seed << 5) - seed + roomId.charCodeAt(i);
    seed |= 0;
  }

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Day of week modulation (Fridays & Saturdays have higher volume -> slightly longer prep)
    const dayOfWeek = d.getDay();
    const weekendMultiplier = dayOfWeek === 5 || dayOfWeek === 6 ? 1.12 : dayOfWeek === 1 ? 0.94 : 1.0;

    // Pseudo-random wave with sine + deterministic noise
    const pseudoRandom = Math.sin(seed * 0.01 + i * 0.7) * 0.5 + Math.cos(i * 1.3) * 0.5;
    const noise = pseudoRandom * config.variance;

    // Slight productivity improvement over the 30 days (-4% over 30 days)
    const learningCurve = 1 - (29 - i) * 0.002;

    const avgMinutes = Math.round(
      Math.max(20, (config.baseMinutes + noise) * weekendMultiplier * learningCurve)
    );

    const batchCount = Math.max(1, Math.round(3 + (Math.abs(pseudoRandom) * 4) + (dayOfWeek === 5 ? 2 : 0)));
    const unitsProduced = Math.round(batchCount * (45 + Math.abs(pseudoRandom) * 30));
    const timePerUnitSeconds = Math.round(config.secPerUnit + pseudoRandom * 5);

    const dateStr = d.toISOString().substring(0, 10);
    const dayLabel = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    data.push({
      date: d,
      dateStr,
      dayLabel,
      avgMinutes,
      batchCount,
      unitsProduced,
      timePerUnitSeconds,
    });
  }

  return data;
}

export function RoomProductionTimeD3Chart({
  roomId,
  roomName,
  categoryFr,
  totalUnitsToday = 0,
  accentColor,
}: RoomProductionTimeD3ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [activeRange, setActiveRange] = useState<30 | 14 | 7>(30);
  const [hoveredPoint, setHoveredPoint] = useState<DailyProductionData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Generate 30 days dataset for this room
  const fullData = useMemo(() => {
    return generateDeterministic30DaysData(roomId);
  }, [roomId]);

  // Filtered dataset based on selected view (30, 14, 7 days)
  const currentData = useMemo(() => {
    return fullData.slice(-activeRange);
  }, [fullData, activeRange]);

  // Calculations: 30-day average, min, max, trend
  const stats = useMemo(() => {
    if (fullData.length === 0) return { avg: 0, min: 0, max: 0, trendPct: 0, todayEstMinutes: 0 };

    const avg = Math.round(d3.mean(fullData, (d) => d.avgMinutes) || 0);
    const min = d3.min(fullData, (d) => d.avgMinutes) || 0;
    const max = d3.max(fullData, (d) => d.avgMinutes) || 0;

    // Trend: Compare last 7 days vs previous 23 days
    const recent7 = fullData.slice(-7);
    const prev23 = fullData.slice(0, 23);
    const recentAvg = d3.mean(recent7, (d) => d.avgMinutes) || avg;
    const prevAvg = d3.mean(prev23, (d) => d.avgMinutes) || avg;
    const trendPct = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0;

    // Estimated schedule duration for today's units
    const config = ROOM_BASE_DURATIONS[roomId] || { secPerUnit: 35 };
    const todayEstMinutes =
      totalUnitsToday > 0
        ? Math.round((totalUnitsToday * config.secPerUnit) / 60)
        : avg;

    return { avg, min, max, trendPct, todayEstMinutes };
  }, [fullData, roomId, totalUnitsToday]);

  const themeHex = useMemo(() => {
    if (accentColor) return accentColor;
    return ROOM_BASE_DURATIONS[roomId]?.hexColor || '#2563eb'; // fallback blue-600
  }, [roomId, accentColor]);

  // Helper format minutes to "1h 35m" or "45m"
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // =========================================================================
  // D3 RENDERING EFFECT
  // =========================================================================
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || currentData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    // Container dimensions
    const containerWidth = containerRef.current.clientWidth || 650;
    const width = Math.max(320, containerWidth);
    const height = 175;

    const margin = { top: 22, right: 28, bottom: 26, left: 46 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Defs for gradients & shadow filters
    const defs = svg.append('defs');

    // Area fill gradient
    const gradientId = `area-gradient-${roomId}`;
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', themeHex)
      .attr('stop-opacity', 0.28);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', themeHex)
      .attr('stop-opacity', 0.0);

    // Glow filter for line
    const filterId = `glow-${roomId}`;
    const filter = defs.append('filter').attr('id', filterId).attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xExtent = d3.extent(currentData, (d) => d.date) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const yMinVal = Math.max(0, (d3.min(currentData, (d) => d.avgMinutes) || 30) - 15);
    const yMaxVal = (d3.max(currentData, (d) => d.avgMinutes) || 120) + 15;
    const yScale = d3.scaleLinear().domain([yMinVal, yMaxVal]).range([innerHeight, 0]);

    // Horizontal grid lines (dashed, subtle slate-200)
    const yTicks = yScale.ticks(4);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1);

    // X Axis
    const tickCount = Math.min(currentData.length, width < 480 ? 4 : 7);
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat((d) => {
        const dt = d as Date;
        return d3.timeFormat('%d %b')(dt);
      })
      .tickSize(0)
      .tickPadding(8);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#cbd5e1').attr('stroke-width', 1);
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '9.5px')
      .attr('font-family', 'sans-serif')
      .attr('font-weight', '500');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d}m`)
      .tickSize(0)
      .tickPadding(6);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '9.5px')
      .attr('font-family', 'sans-serif')
      .attr('font-weight', '600');

    // 30-Day Average Benchmark Line (dashed slate-500)
    const avgY = yScale(stats.avg);
    if (avgY >= 0 && avgY <= innerHeight) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', avgY)
        .attr('y2', avgY)
        .attr('stroke', '#475569')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1.25)
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', avgY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#334155')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .text(`Moyenne 30j : ${stats.avg} min`);
    }

    // Area generator
    const areaGenerator = d3
      .area<DailyProductionData>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.avgMinutes))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(currentData)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', areaGenerator);

    // Line generator
    const lineGenerator = d3
      .line<DailyProductionData>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.avgMinutes))
      .curve(d3.curveMonotoneX);

    // Smooth path line
    g.append('path')
      .datum(currentData)
      .attr('fill', 'none')
      .attr('stroke', themeHex)
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', lineGenerator);

    // Data points (circles)
    g.selectAll('.data-point')
      .data(currentData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.avgMinutes))
      .attr('r', 3)
      .attr('fill', '#ffffff')
      .attr('stroke', themeHex)
      .attr('stroke-width', 1.8);

    // Latest day highlight circle with pulse ring
    const latest = currentData[currentData.length - 1];
    if (latest) {
      const latestX = xScale(latest.date);
      const latestY = yScale(latest.avgMinutes);

      g.append('circle')
        .attr('cx', latestX)
        .attr('cy', latestY)
        .attr('r', 6)
        .attr('fill', themeHex)
        .attr('opacity', 0.25);

      g.append('circle')
        .attr('cx', latestX)
        .attr('cy', latestY)
        .attr('r', 4)
        .attr('fill', themeHex)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    }

    // Interactive Hover Tracking Guide Line & Circles
    const focusGroup = g.append('g').attr('class', 'focus-guide').style('display', 'none');

    const verticalGuide = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#475569')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    const focusCircle = focusGroup
      .append('circle')
      .attr('r', 5.5)
      .attr('fill', themeHex)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);

    // Bisector for finding closest data point
    const bisectDate = d3.bisector<DailyProductionData, Date>((d) => d.date).center;

    // Overlay rect for pointer interactions
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mouseenter', () => {
        focusGroup.style('display', null);
      })
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const hoveredDate = xScale.invert(mx);
        const idx = bisectDate(currentData, hoveredDate);
        const d = currentData[idx];

        if (d) {
          const x = xScale(d.date);
          const y = yScale(d.avgMinutes);

          verticalGuide.attr('x1', x).attr('x2', x);
          focusCircle.attr('cx', x).attr('cy', y);

          setHoveredPoint(d);
          setTooltipPos({
            x: x + margin.left,
            y: y + margin.top,
          });
        }
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
        setTooltipPos(null);
      });
  }, [currentData, roomId, themeHex, stats.avg]);

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Mini-Chart Header & Key Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
            style={{ backgroundColor: themeHex }}
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Cadence & Temps Moyen de Fabrication
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-mono">
                30 Jours
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Historique de production de l'atelier {roomName} • Optimisation de l'ordonnancement
            </p>
          </div>
        </div>

        {/* Range switcher pills (30j, 14j, 7j) */}
        <div className="flex items-center gap-1.5 self-start sm:self-center print:hidden">
          {([30, 14, 7] as const).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRange === range
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {range}j
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* 30-Day Average */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Durée Moyenne / Fournée
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-slate-900">{formatDuration(stats.avg)}</span>
            <span className="text-[10px] text-slate-400 font-medium">({stats.avg}m)</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            Baseline sur {activeRange} jours
          </span>
        </div>

        {/* Trend vs Previous */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Tendance Récente (7j)
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {stats.trendPct <= 0 ? (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-black text-sm">
                <TrendingDown className="w-4 h-4" /> {Math.abs(stats.trendPct)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-amber-600 font-black text-sm">
                <TrendingUp className="w-4 h-4" /> +{stats.trendPct}%
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-medium">
              {stats.trendPct <= 0 ? 'Gain cadence' : 'Charge accrue'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            vs 23 jours précédents
          </span>
        </div>

        {/* Range Extents (Min - Max) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Écart & Amplitude
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-bold text-slate-800 text-sm">{stats.min}m</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-slate-800 text-sm">{stats.max}m</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            Variabilité : ±{Math.round((stats.max - stats.min) / 2)} min
          </span>
        </div>

        {/* Recommended Daily Planning Slot */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Estimation OF Aujourd'hui
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-slate-900">
              ~{formatDuration(stats.todayEstMinutes)}
            </span>
            {totalUnitsToday > 0 && (
              <span className="text-[10px] text-slate-500 font-bold">({totalUnitsToday} pcs)</span>
            )}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
            Marge de confort (+15m) incluse
          </span>
        </div>
      </div>

      {/* D3 Mini-Chart SVG Canvas */}
      <div ref={containerRef} className="relative w-full bg-white rounded-xl p-2 border border-slate-200/80">
        <svg ref={svgRef} className="overflow-visible block" />

        {/* Dynamic Tooltip */}
        {hoveredPoint && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg border border-slate-700 -translate-x-1/2 -translate-y-full mb-2 transition-transform duration-75"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
            }}
          >
            <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-0.5 mb-1 flex items-center justify-between gap-3">
              <span>{hoveredPoint.dayLabel}</span>
              <span className="font-mono text-[10px] text-amber-400">
                {hoveredPoint.batchCount} fournée{hoveredPoint.batchCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Durée moyenne :</span>
              <strong className="text-white font-mono">{hoveredPoint.avgMinutes} min</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-slate-400">Écart vs moy. :</span>
              <span
                className={`font-mono font-bold ${
                  hoveredPoint.avgMinutes <= stats.avg ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {hoveredPoint.avgMinutes - stats.avg > 0 ? '+' : ''}
                {hoveredPoint.avgMinutes - stats.avg} min
              </span>
            </div>
            {hoveredPoint.unitsProduced > 0 && (
              <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mt-0.5">
                <span>Volume jour :</span>
                <span>{hoveredPoint.unitsProduced} pièces</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manager Scheduling Recommendation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 bg-white/60 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            <strong>Recommandation d'Ordonnancement :</strong> Pour ce volume de{' '}
            <strong className="text-slate-900">{totalUnitsToday} unités</strong>, allouer un créneau de{' '}
            <strong className="text-blue-700">{formatDuration(stats.todayEstMinutes)}</strong> dans le poste de travail sélectionné.
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono shrink-0">
          Source : Mesures D3 Central Lab (30j)
        </div>
      </div>
    </div>
  );
}
