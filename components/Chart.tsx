
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    createChart, 
    IChartApi, 
    ISeriesApi, 
    CandlestickData, 
    ColorType, 
    CrosshairMode, 
    CandlestickSeries,
    AreaSeries,
    LineSeries,
    LineData,
    Time,
    HistogramSeries,
    Coordinate
} from 'lightweight-charts';
import { CandleData, DrawingObject, DrawingTool, PurchaseInfo, ChartType, PriceAlert, Indicator, DrawingStyle, ChartIndicatorSettings } from '../types';
import { calculateSMA, calculateEMA, calculateRSI } from '../utils/indicators';
import { isNearLine, isNearPoint, isInRect, snapToAngle } from '../utils/drawingUtils';
import DrawingSettingsPopup from './DrawingSettingsPopup';

interface ChartProps {
  data: CandleData[];
  symbol: string;
  activeTool: DrawingTool;
  onAddDrawing: (drawing: DrawingObject) => void;
  onUpdateDrawing: (id: string, updates: Partial<DrawingObject>) => void;
  onDeleteDrawing: (id: string) => void;
  drawings: DrawingObject[];
  purchaseMarkers?: PurchaseInfo[];
  chartType: ChartType;
  timeLeft: string; 
  alerts?: PriceAlert[];
  onCreateAlert?: (price: number) => void;
  indicators: Indicator[];
  entryMarker?: { symbol: string, price: number, time?: number } | null;
  chartIndicatorSettings?: ChartIndicatorSettings;
  onToggleIndicator?: (id: string) => void;
  onRemoveIndicator?: (id: string) => void;
  onChartIndicatorToggle?: (key: keyof ChartIndicatorSettings, enabled: boolean) => void;
  onUpdateChartIndicatorSettings?: (settings: ChartIndicatorSettings) => void;
  // Trading props
  onBuy?: () => void;
  onSell?: () => void;
  isPaperMode?: boolean;
  currentPrice?: number;
}

const Chart: React.FC<ChartProps> = ({ 
  data, 
  symbol, 
  activeTool, 
  onAddDrawing, 
  onUpdateDrawing,
  onDeleteDrawing,
  drawings, 
  purchaseMarkers,
  chartType,
  timeLeft,
  alerts,
  onCreateAlert,
  indicators,
  entryMarker,
  chartIndicatorSettings,
  onToggleIndicator,
  onRemoveIndicator,
  onChartIndicatorToggle,
  onUpdateChartIndicatorSettings,
  onBuy,
  onSell,
  isPaperMode = true,
  currentPrice = 0,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick" | "Area" | "Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  // Chart State
  const [ohlc, setOhlc] = useState<{o: string, h: string, l: string, c: string, change: number} | null>(null);
  
  // Crosshair position for labels
  const [crosshairPos, setCrosshairPos] = useState<{x: number, y: number, price: number, time: number} | null>(null);
  
  // Indicators panel state
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showActiveIndicatorsMenu, setShowActiveIndicatorsMenu] = useState(false);
  
  // Track symbol changes to reset chart view
  const prevSymbolRef = useRef<string>(symbol);
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragState, setDragState] = useState<{
      id: string; 
      part: 'start' | 'end' | 'body'; 
      startMouse: { x: number, y: number };
      initialStart: { time: number, price: number };
      initialEnd: { time: number, price: number };
  } | null>(null);
  
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [tempDrawing, setTempDrawing] = useState<{ start: {x:number, y:number}, end: {x:number, y:number} } | null>(null);

  // Load default drawing settings from localStorage
  const getDefaultDrawingStyle = useCallback((): DrawingStyle => {
    const saved = localStorage.getItem('tv_drawing_defaults');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { lineColor: '#2962ff', lineWidth: 2, lineStyle: 0, fillColor: '#2962ff', fillOpacity: 0.2, fillEnabled: true, showLabel: false, fontSize: 12 };
  }, []);

  // Save drawing settings to localStorage
  const saveDrawingDefaults = useCallback((style: DrawingStyle) => {
    localStorage.setItem('tv_drawing_defaults', JSON.stringify(style));
  }, []);

  // Helper: Convert Pixel to Logic (allows drawing outside visible range)
  const toLogic = (x: number, y: number) => {
      if (!chartRef.current || !seriesRef.current) return null;
      const time = chartRef.current.timeScale().coordinateToTime(x) as number;
      const price = seriesRef.current.coordinateToPrice(y);
      
      // Allow drawing even if time is outside data range
      // Estimate time based on visible range if coordinateToTime returns null
      if (time === null && data.length > 0) {
          const visibleRange = chartRef.current.timeScale().getVisibleLogicalRange();
          if (visibleRange) {
              const width = chartRef.current.timeScale().width();
              const timePerPixel = (visibleRange.to - visibleRange.from) / width;
              const estimatedLogicalIndex = visibleRange.from + x * timePerPixel;
              // Convert logical index to approximate timestamp
              const avgInterval = data.length > 1 ? (data[data.length - 1].time - data[0].time) / (data.length - 1) : 3600;
              const estimatedTime = data[0].time + estimatedLogicalIndex * avgInterval;
              return price !== null ? { time: Math.round(estimatedTime), price } : null;
          }
      }
      
      return (time !== null && price !== null) ? { time, price } : null;
  };

  // Helper: Convert Logic to Pixel (handles coordinates outside visible range)
  const toPixel = (time: number, price: number) => {
      if (!chartRef.current || !seriesRef.current) return null;
      let x = chartRef.current.timeScale().timeToCoordinate(time as Time);
      const y = seriesRef.current.priceToCoordinate(price);
      
      // If x is null (outside visible range), estimate position
      if (x === null && data.length > 0) {
          const visibleRange = chartRef.current.timeScale().getVisibleLogicalRange();
          if (visibleRange) {
              const width = chartRef.current.timeScale().width();
              const avgInterval = data.length > 1 ? (data[data.length - 1].time - data[0].time) / (data.length - 1) : 3600;
              const logicalIndex = (time - data[0].time) / avgInterval;
              const pixelPerLogical = width / (visibleRange.to - visibleRange.from);
              x = (logicalIndex - visibleRange.from) * pixelPerLogical as Coordinate;
          }
      }
      
      return (x !== null && y !== null) ? { x, y } : null;
  };

  // Helper: Hex to RGBA
  const hexToRgba = (hex: string, alpha: number) => {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      // If legacy RGBA, return as is (or parse if needed, but assuming Hex mostly now)
      if (hex.startsWith('rgba')) return hex;
      
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
      }
      return `rgba(${r},${g},${b},${alpha})`;
  };

  // --- Chart Initialization ---
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#a0a0a0', attributionLogo: false },
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { 
        borderColor: '#2a2a2a', 
        timeVisible: true, 
        rightOffset: 50, 
        secondsVisible: false, 
        shiftVisibleRangeOnNewBar: false,
        allowShiftVisibleRangeOnWhitespaceReplacement: true,
      },
      rightPriceScale: { 
        borderColor: '#2a2a2a',
        autoScale: true,
      },
      crosshair: { 
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#2962ff',
        },
      },
      handleScale: { 
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true, 
        pinch: true,
      },
      handleScroll: { 
        mouseWheel: true, 
        pressedMouseMove: true, 
        horzTouchDrag: true, 
        vertTouchDrag: true,
      },
      kineticScroll: { touch: true, mouse: true },
    });
    chartRef.current = chart;

    // Subscribe to crosshair move for position labels
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || param.point.x < 0 || param.point.y < 0) {
        setCrosshairPos(null);
        return;
      }
      const time = param.time as number;
      if (time && seriesRef.current) {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          setCrosshairPos({ x: param.point.x, y: param.point.y, price, time });
        }
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0 || !entries[0].contentRect) return;
        const { width, height } = entries[0].contentRect;
        if (chartRef.current) chartRef.current.resize(width, height);
        if (canvasRef.current) { canvasRef.current.width = width; canvasRef.current.height = height; requestAnimationFrame(redrawCanvas); }
    });
    resizeObserver.observe(chartContainerRef.current);

    chart.timeScale().subscribeVisibleTimeRangeChange(() => requestAnimationFrame(redrawCanvas));

    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, []);

  // --- Series & Data Logic ---
  useEffect(() => {
    if (!chartRef.current) return;
    
    try {
        if (seriesRef.current && chartRef.current) {
            try {
                chartRef.current.removeSeries(seriesRef.current);
            } catch (removeErr) {
                // Series might already be removed, ignore
            }
            seriesRef.current = null;
        }
    } catch (e) { /* Ignore removal errors */ }
    
    let newSeries: any;
    if (chartType === 'Area') newSeries = chartRef.current.addSeries(AreaSeries, { lineColor: '#2962ff', topColor: 'rgba(41, 98, 255, 0.3)', bottomColor: 'rgba(41, 98, 255, 0)' });
    else if (chartType === 'Line') newSeries = chartRef.current.addSeries(LineSeries, { color: '#2962ff', lineWidth: 2 });
    else newSeries = chartRef.current.addSeries(CandlestickSeries, { upColor: '#ffffff', downColor: '#666666', borderUpColor: '#ffffff', borderDownColor: '#666666', wickUpColor: '#ffffff', wickDownColor: '#666666' });
    
    seriesRef.current = newSeries;
    
    chartRef.current.subscribeCrosshairMove((param) => {
        try {
            if (param.time && param.seriesData && param.seriesData.get(newSeries)) {
                const d = param.seriesData.get(newSeries) as any;
                if (!d) return;
                const open = d.open ?? d.value ?? 0; 
                const close = d.close ?? d.value ?? 0;
                const high = d.high ?? d.value ?? 0;
                const low = d.low ?? d.value ?? 0;
                const change = open !== 0 ? ((close - open) / open) * 100 : 0;
                setOhlc({ o: open.toFixed(2), h: high.toFixed(2), l: low.toFixed(2), c: close.toFixed(2), change });
            }
        } catch (e) { /* ignore crosshair errors */ }
    });

    if (data && data.length > 0) {
        try {
            const d = chartType === 'Candlestick' 
                ? data.filter(d => d.time != null && d.open != null).map(d => ({...d, time: d.time as Time})) 
                : data.filter(d => d.time != null && d.close != null).map(d => ({time: d.time as Time, value: d.close}));
            if (d.length > 0) newSeries.setData(d);
        } catch (e) { console.warn('Chart setData error:', e); }
    }
  }, [chartType]);

  useEffect(() => {
      if (seriesRef.current && data && data.length > 0) {
        try {
            const symbolChanged = prevSymbolRef.current !== symbol;
            
            const d = chartType === 'Candlestick' 
                ? data.filter(d => d.time != null && d.open != null).map(d => ({...d, time: d.time as Time})) 
                : data.filter(d => d.time != null && d.close != null).map(d => ({time: d.time as Time, value: d.close}));
            
            if (d.length > 0) {
                seriesRef.current.setData(d);
                
                // When symbol changes, reset both time and price scales
                if (symbolChanged && chartRef.current) {
                    prevSymbolRef.current = symbol;
                    
                    // Reset price scale to auto mode
                    chartRef.current.priceScale('right').applyOptions({
                        autoScale: true,
                    });
                    
                    // Fit content after short delay to ensure data is rendered
                    setTimeout(() => {
                        if (chartRef.current) {
                            // Fit time scale
                            chartRef.current.timeScale().fitContent();
                            
                            // Show last 100 bars for better view
                            const barsToShow = Math.min(100, d.length);
                            const from = d.length - barsToShow;
                            const to = d.length + 10;
                            chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
                        }
                    }, 100);
                }
            }
        } catch (e) { console.warn('Chart update error:', e); }
      }
  }, [data, chartType, symbol]);

  // Volume Series
  useEffect(() => {
      if (!chartRef.current) return;
      
      // Remove existing volume series
      if (volumeSeriesRef.current) {
          try {
              chartRef.current.removeSeries(volumeSeriesRef.current);
          } catch (e) { /* ignore */ }
          volumeSeriesRef.current = null;
      }
      
      // Add volume series if enabled
      if (chartIndicatorSettings?.volume?.enabled && data && data.length > 0) {
          const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
              priceFormat: { type: 'volume' },
              priceScaleId: 'volume',
          });
          
          chartRef.current.priceScale('volume').applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
          });
          
          // Use real volume data if available, otherwise use price range as proxy
          const volumeData = data.map(candle => ({
              time: candle.time as Time,
              value: candle.volume || (candle.high - candle.low) * 1000000, // Use real volume or scale up price range
              color: candle.close >= candle.open 
                  ? chartIndicatorSettings.volume.upColor + '80'
                  : chartIndicatorSettings.volume.downColor + '80'
          }));
          
          volumeSeries.setData(volumeData);
          volumeSeriesRef.current = volumeSeries;
      }
  }, [chartIndicatorSettings?.volume?.enabled, data]);

  useEffect(() => {
      if (!chartRef.current || !data || data.length === 0) return;
      indicatorSeriesRefs.current.forEach(s => chartRef.current!.removeSeries(s));
      indicatorSeriesRefs.current = [];
      
      // Standard indicators (SMA, EMA, RSI)
      indicators.forEach(ind => {
          if (!ind.active) return;
          const calc = ind.type === 'SMA' ? calculateSMA(data, ind.period) : ind.type === 'EMA' ? calculateEMA(data, ind.period) : calculateSMA(data, 14);
          if (calc.length > 0) {
              const s = chartRef.current!.addSeries(LineSeries, { color: ind.color, lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
              s.setData(calc.map(d => ({ time: d.time as Time, value: d.value })));
              indicatorSeriesRefs.current.push(s);
          }
      });

      // VWAP
      if (chartIndicatorSettings?.vwap?.enabled) {
          // Calculate VWAP (using typical price * volume approximation)
          let cumulativeTPV = 0;
          let cumulativeVolume = 0;
          const vwapData: { time: Time; value: number }[] = [];
          
          data.forEach(candle => {
              const typicalPrice = (candle.high + candle.low + candle.close) / 3;
              const volume = candle.high - candle.low; // Use price range as volume proxy
              cumulativeTPV += typicalPrice * volume;
              cumulativeVolume += volume;
              const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;
              vwapData.push({ time: candle.time as Time, value: vwap });
          });
          
          if (vwapData.length > 0) {
              const s = chartRef.current!.addSeries(LineSeries, { 
                  color: chartIndicatorSettings.vwap.color, 
                  lineWidth: 2, 
                  crosshairMarkerVisible: false, 
                  lastValueVisible: true, 
                  priceLineVisible: false 
              });
              s.setData(vwapData);
              indicatorSeriesRefs.current.push(s);
          }
      }

      // Bollinger Bands
      if (chartIndicatorSettings?.bollinger?.enabled) {
          const period = chartIndicatorSettings.bollinger.period;
          const stdDevMultiplier = chartIndicatorSettings.bollinger.stdDev;
          const color = chartIndicatorSettings.bollinger.color;
          
          const middleBand: { time: Time; value: number }[] = [];
          const upperBand: { time: Time; value: number }[] = [];
          const lowerBand: { time: Time; value: number }[] = [];
          
          for (let i = period - 1; i < data.length; i++) {
              const slice = data.slice(i - period + 1, i + 1);
              const closes = slice.map(d => d.close);
              const sma = closes.reduce((a, b) => a + b, 0) / period;
              const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
              const stdDev = Math.sqrt(variance);
              
              middleBand.push({ time: data[i].time as Time, value: sma });
              upperBand.push({ time: data[i].time as Time, value: sma + stdDev * stdDevMultiplier });
              lowerBand.push({ time: data[i].time as Time, value: sma - stdDev * stdDevMultiplier });
          }
          
          // Middle band (SMA)
          if (middleBand.length > 0) {
              const sMid = chartRef.current!.addSeries(LineSeries, { 
                  color: color, 
                  lineWidth: 1, 
                  crosshairMarkerVisible: false, 
                  lastValueVisible: false, 
                  priceLineVisible: false 
              });
              sMid.setData(middleBand);
              indicatorSeriesRefs.current.push(sMid);
          }
          
          // Upper band
          if (upperBand.length > 0) {
              const sUp = chartRef.current!.addSeries(LineSeries, { 
                  color: color, 
                  lineWidth: 1, 
                  lineStyle: 2, // dotted
                  crosshairMarkerVisible: false, 
                  lastValueVisible: false, 
                  priceLineVisible: false 
              });
              sUp.setData(upperBand);
              indicatorSeriesRefs.current.push(sUp);
          }
          
          // Lower band
          if (lowerBand.length > 0) {
              const sLow = chartRef.current!.addSeries(LineSeries, { 
                  color: color, 
                  lineWidth: 1, 
                  lineStyle: 2, // dotted
                  crosshairMarkerVisible: false, 
                  lastValueVisible: false, 
                  priceLineVisible: false 
              });
              sLow.setData(lowerBand);
              indicatorSeriesRefs.current.push(sLow);
          }
      }
  }, [indicators, data, chartIndicatorSettings]);

  // --- Interaction Logic ---

  const hitTest = (x: number, y: number) => {
      if (selectedDrawingId) {
          const d = drawings.find(dr => dr.id === selectedDrawingId);
          if (d) {
              const startPx = toPixel(d.start.time, d.start.price);
              const endPx = toPixel(d.end.time, d.end.price);
              if (startPx && isNearPoint({x, y}, startPx)) return { id: d.id, part: 'start' as const };
              if (endPx && isNearPoint({x, y}, endPx)) return { id: d.id, part: 'end' as const };
          }
      }

      for (let i = drawings.length - 1; i >= 0; i--) {
          const d = drawings[i];
          const p1 = toPixel(d.start.time, d.start.price);
          const p2 = toPixel(d.end.time, d.end.price);
          if (!p1 || !p2) continue;

          let hit = false;
          if (d.tool === 'trendline' || d.tool === 'arrow') hit = isNearLine({x, y}, p1, p2);
          else if (d.tool === 'rectangle' || d.tool === 'fibonacci') hit = isInRect({x, y}, p1, p2);
          else if (d.tool === 'horizontal') hit = Math.abs(y - p1.y) < 6;
          else if (d.tool === 'vertical') hit = Math.abs(x - p1.x) < 6;
          else if (d.tool === 'text') hit = isNearPoint({x,y}, p1, 20);

          if (hit) return { id: d.id, part: 'body' as const };
      }
      return null;
  };

  // Get coordinates from mouse or touch event
  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent): {x: number, y: number} | null => {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      
      if ('touches' in e) {
          if (e.touches.length === 0) return null;
          const touch = e.touches[0];
          return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      } else {
          return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      const coords = getEventCoordinates(e);
      if (!coords) return;
      const { x, y } = coords;

      if (activeTool === 'alert' && onCreateAlert && seriesRef.current) {
          const price = seriesRef.current.coordinateToPrice(y);
          if (price) onCreateAlert(price);
          e.stopPropagation();
          return;
      }

      if (activeTool === 'cursor') {
          const hit = hitTest(x, y);
          if (hit) {
              e.stopPropagation(); // Stop event from reaching chart
              const d = drawings.find(dr => dr.id === hit.id)!;
              if (d.locked) return;

              setSelectedDrawingId(hit.id);
              setDragState({
                  id: hit.id,
                  part: hit.part,
                  startMouse: { x, y },
                  initialStart: { ...d.start },
                  initialEnd: { ...d.end }
              });
              chartRef.current!.applyOptions({ handleScroll: false, handleScale: false });
          } else {
              setSelectedDrawingId(null);
          }
          return; // Let chart handle the event for scrolling/zooming
      }

      // Starting a new drawing
      e.stopPropagation();
      const logic = toLogic(x, y);
      if (logic) {
          setIsDrawing(true);
          setTempDrawing({ start: {x, y}, end: {x, y} });
          setDragState({
              id: 'temp',
              part: 'end',
              startMouse: { x, y },
              initialStart: logic,
              initialEnd: logic
          });
      }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const coords = getEventCoordinates(e);
      if (!coords) return;
      const { x, y } = coords;

      if (activeTool === 'cursor' && !dragState) {
          const hit = hitTest(x, y);
          setHoveredDrawingId(hit ? hit.id : null);
          chartContainerRef.current!.style.cursor = hit ? (hit.part === 'body' ? 'move' : 'crosshair') : 'default';
      } else if (activeTool !== 'cursor') {
          chartContainerRef.current!.style.cursor = 'crosshair';
      }

      if (dragState) {
          e.stopPropagation(); // Stop chart from scrolling while dragging
          const logic = toLogic(x, y);
          if (!logic) return;

          if (isDrawing) {
              setTempDrawing(prev => prev ? ({ ...prev, end: {x, y} }) : null);
          } else {
              const drawing = drawings.find(d => d.id === dragState.id);
              if (!drawing) return;

              if (dragState.part === 'body') {
                  const startLogic = toLogic(dragState.startMouse.x, dragState.startMouse.y)!;
                  const dt = logic.time - startLogic.time;
                  const dp = logic.price - startLogic.price;

                  onUpdateDrawing(drawing.id, {
                      start: { time: dragState.initialStart.time + dt, price: dragState.initialStart.price + dp },
                      end: { time: dragState.initialEnd.time + dt, price: dragState.initialEnd.price + dp }
                  });
              } else {
                  onUpdateDrawing(drawing.id, { [dragState.part]: logic });
              }
          }
      }
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
      if (dragState) {
          if (isDrawing) {
              const coords = getEventCoordinates(e);
              const logicStart = dragState.initialStart;
              const logicEnd = coords ? toLogic(coords.x, coords.y) : null;
              
              if (logicEnd) {
                  // Use saved defaults from localStorage
                  const defaultStyle: DrawingStyle = getDefaultDrawingStyle();
                  
                  const newDrawing: DrawingObject = {
                      id: Date.now().toString(),
                      tool: activeTool,
                      start: logicStart,
                      end: logicEnd,
                      style: { ...defaultStyle, showLabel: false, fontSize: 12 }
                  };
                  onAddDrawing(newDrawing);
                  setSelectedDrawingId(newDrawing.id);
              }
          }
      }
      setIsDrawing(false);
      setDragState(null);
      setTempDrawing(null);
  };

  // --- Rendering ---
  const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !seriesRef.current) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      alerts?.forEach(a => {
           if (!a.isActive) return;
           const y = seriesRef.current!.priceToCoordinate(a.targetPrice);
           if (y) {
               ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
               ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
               ctx.fillStyle = '#ef5350'; ctx.fillText('🔔', canvas.width - 20, y - 5);
           }
      });

      const allDrawings = [...drawings];
      if (isDrawing && tempDrawing && dragState?.initialStart && dragState?.initialEnd) {
          // Render temp drawing while dragging to create
          allDrawings.push({ 
              id: 'temp', 
              tool: activeTool, 
              start: toLogic(tempDrawing.start.x, tempDrawing.start.y)!, 
              end: toLogic(tempDrawing.end.x, tempDrawing.end.y)!, 
              style: { 
                  lineColor: '#2962ff', lineWidth: 2, lineStyle: 0, 
                  fillColor: '#2962ff', fillOpacity: 0.2, fillEnabled: true,
                  showLabel: false, fontSize: 12
              } 
          } as any);
      }

      allDrawings.forEach(d => {
          const p1 = toPixel(d.start.time, d.start.price);
          const p2 = toPixel(d.end.time, d.end.price);
          if (!p1 || !p2) return;

          const isSelected = d.id === selectedDrawingId;
          const isHovered = d.id === hoveredDrawingId;
          // Fallback defaults if style is missing
          const style = d.style || { lineColor: '#fff', lineWidth: 1, lineStyle: 0, fillColor: '#fff', fillOpacity: 0.1, fillEnabled: true, showLabel: false, fontSize: 12 };

          ctx.save();
          ctx.strokeStyle = style.lineColor;
          ctx.lineWidth = style.lineWidth;
          ctx.setLineDash(style.lineStyle === 1 ? [5, 5] : style.lineStyle === 2 ? [2, 2] : []);
          
          if (isSelected || isHovered) {
              ctx.shadowColor = style.lineColor;
              ctx.shadowBlur = 10;
          }

          ctx.beginPath();
          if (d.tool === 'trendline' || d.tool === 'arrow') {
              ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
              if (d.tool === 'arrow') {
                  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                  ctx.beginPath(); ctx.moveTo(p2.x, p2.y);
                  ctx.lineTo(p2.x - 10 * Math.cos(angle - Math.PI/6), p2.y - 10 * Math.sin(angle - Math.PI/6));
                  ctx.lineTo(p2.x - 10 * Math.cos(angle + Math.PI/6), p2.y - 10 * Math.sin(angle + Math.PI/6));
                  ctx.fillStyle = style.lineColor; ctx.fill();
              }
          } else if (d.tool === 'rectangle') {
              const w = p2.x - p1.x; 
              const h = p2.y - p1.y;
              
              if (style.fillEnabled !== false) {
                  ctx.fillStyle = hexToRgba(style.fillColor, style.fillOpacity ?? 0.2);
                  ctx.fillRect(p1.x, p1.y, w, h);
              }
              
              ctx.strokeRect(p1.x, p1.y, w, h);
              
          } else if (d.tool === 'horizontal') {
              ctx.moveTo(0, p1.y); ctx.lineTo(canvas.width, p1.y); ctx.stroke();
          } else if (d.tool === 'vertical') {
              ctx.moveTo(p1.x, 0); ctx.lineTo(p1.x, canvas.height); ctx.stroke();
          } else if (d.tool === 'fibonacci') {
               const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
               const h = p2.y - p1.y;
               levels.forEach(l => {
                   const y = p1.y + h * l;
                   ctx.beginPath(); ctx.moveTo(p1.x, y); ctx.lineTo(p2.x, y); ctx.stroke();
                   ctx.fillStyle = style.lineColor; ctx.font = '10px sans-serif'; ctx.fillText(l.toString(), p1.x, y - 2);
               });
          } else if (d.tool === 'text') {
              ctx.font = `${style.fontSize || 16}px Inter`;
              ctx.fillStyle = style.lineColor;
              ctx.fillText(d.text || "Text", p1.x, p1.y);
          }
          ctx.restore();

          if (isSelected) {
              const drawAnchor = (x:number, y:number) => {
                  ctx.fillStyle = 'white'; ctx.strokeStyle = '#2962ff'; ctx.lineWidth = 2;
                  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
              };
              drawAnchor(p1.x, p1.y);
              drawAnchor(p2.x, p2.y);
          }
      });

      // Draw entry marker if present
      if (entryMarker && entryMarker.symbol === symbol && seriesRef.current) {
          const y = seriesRef.current.priceToCoordinate(entryMarker.price);
          if (y !== null) {
              ctx.save();
              // Draw horizontal line at entry price
              ctx.setLineDash([5, 5]);
              ctx.strokeStyle = '#00ff88';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(canvas.width, y);
              ctx.stroke();
              
              // Draw label
              ctx.setLineDash([]);
              ctx.fillStyle = '#00ff88';
              ctx.font = 'bold 11px Inter';
              const labelText = `Entry: $${entryMarker.price.toLocaleString()}`;
              const textWidth = ctx.measureText(labelText).width;
              
              // Background for label
              ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
              ctx.fillRect(10, y - 20, textWidth + 16, 18);
              ctx.strokeStyle = '#00ff88';
              ctx.lineWidth = 1;
              ctx.strokeRect(10, y - 20, textWidth + 16, 18);
              
              // Text
              ctx.fillStyle = '#00ff88';
              ctx.fillText(labelText, 18, y - 7);
              
              // Draw arrow marker
              ctx.beginPath();
              ctx.moveTo(canvas.width - 30, y);
              ctx.lineTo(canvas.width - 20, y - 8);
              ctx.lineTo(canvas.width - 20, y + 8);
              ctx.closePath();
              ctx.fill();
              
              ctx.restore();
          }
      }

      // Draw Volume Profile on the right side
      if (chartIndicatorSettings?.volumeProfile?.enabled && data.length > 0 && seriesRef.current) {
          const vpSettings = chartIndicatorSettings.volumeProfile;
          const rowCount = vpSettings.rowCount || 24;
          
          // Calculate price range from visible data
          const prices = data.map(d => [d.high, d.low]).flat();
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const priceRange = maxPrice - minPrice;
          const priceStep = priceRange / rowCount;
          
          // Build volume profile - volume at each price level
          const volumeAtPrice: { price: number; volume: number }[] = [];
          for (let i = 0; i < rowCount; i++) {
              const levelPrice = minPrice + priceStep * i + priceStep / 2;
              volumeAtPrice.push({ price: levelPrice, volume: 0 });
          }
          
          // Assign candle volumes to price levels (simple: whole candle volume to close level)
          data.forEach(candle => {
              const candleVolume = candle.high - candle.low; // Use price range as volume proxy
              const levelIndex = Math.floor((candle.close - minPrice) / priceStep);
              if (levelIndex >= 0 && levelIndex < rowCount) {
                  volumeAtPrice[levelIndex].volume += candleVolume;
              }
          });
          
          // Find max volume and POC (Point of Control)
          const maxVolume = Math.max(...volumeAtPrice.map(v => v.volume));
          let pocIndex = 0;
          let pocVolume = 0;
          volumeAtPrice.forEach((v, i) => {
              if (v.volume > pocVolume) {
                  pocVolume = v.volume;
                  pocIndex = i;
              }
          });
          
          // Calculate Value Area (70% of total volume around POC)
          const totalVolume = volumeAtPrice.reduce((sum, v) => sum + v.volume, 0);
          const targetVolume = totalVolume * (vpSettings.valueAreaPercent / 100);
          let valueAreaVolume = volumeAtPrice[pocIndex].volume;
          let upperIndex = pocIndex;
          let lowerIndex = pocIndex;
          
          while (valueAreaVolume < targetVolume && (upperIndex < rowCount - 1 || lowerIndex > 0)) {
              const upperVol = upperIndex < rowCount - 1 ? volumeAtPrice[upperIndex + 1].volume : 0;
              const lowerVol = lowerIndex > 0 ? volumeAtPrice[lowerIndex - 1].volume : 0;
              
              if (upperVol >= lowerVol && upperIndex < rowCount - 1) {
                  upperIndex++;
                  valueAreaVolume += volumeAtPrice[upperIndex].volume;
              } else if (lowerIndex > 0) {
                  lowerIndex--;
                  valueAreaVolume += volumeAtPrice[lowerIndex].volume;
              }
          }
          
          // Draw volume profile bars on right side
          const profileWidth = 80; // Width of profile area
          const profileRight = canvas.width - 10; // Right edge position
          
          ctx.save();
          volumeAtPrice.forEach((level, i) => {
              const y = seriesRef.current!.priceToCoordinate(level.price);
              if (y === null) return;
              
              const barWidth = (level.volume / maxVolume) * profileWidth;
              const barHeight = Math.max(2, priceStep * 0.8 * (canvas.height / priceRange));
              const x = profileRight - barWidth;
              
              // Color based on POC, Value Area, or regular
              if (i === pocIndex) {
                  ctx.fillStyle = hexToRgba(vpSettings.pocColor, 0.8);
              } else if (i >= lowerIndex && i <= upperIndex) {
                  ctx.fillStyle = hexToRgba(vpSettings.valueAreaColor, 0.5);
              } else {
                  ctx.fillStyle = hexToRgba(vpSettings.volumeColor, 0.3);
              }
              
              ctx.fillRect(x, y - barHeight / 2, barWidth, barHeight);
              
              // POC line
              if (i === pocIndex) {
                  ctx.strokeStyle = vpSettings.pocColor;
                  ctx.lineWidth = 1;
                  ctx.setLineDash([3, 3]);
                  ctx.beginPath();
                  ctx.moveTo(0, y);
                  ctx.lineTo(profileRight - barWidth - 5, y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  
                  // POC label
                  ctx.font = '9px Inter';
                  ctx.fillStyle = vpSettings.pocColor;
                  ctx.fillText('POC', 5, y + 3);
              }
          });
          ctx.restore();
      }

  }, [drawings, selectedDrawingId, hoveredDrawingId, isDrawing, tempDrawing, alerts, entryMarker, symbol, chartIndicatorSettings, data]);

  useEffect(() => {
      let rafId: number;
      const loop = () => { redrawCanvas(); rafId = requestAnimationFrame(loop); };
      loop();
      return () => cancelAnimationFrame(rafId);
  }, [redrawCanvas]);

  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
              onDeleteDrawing(selectedDrawingId);
              setSelectedDrawingId(null);
          }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [selectedDrawingId]);

  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
  const popupPos = selectedDrawing ? toPixel(selectedDrawing.end.time, selectedDrawing.end.price) : null;

  // Wrapper for onUpdateDrawing to save style defaults
  const handleUpdateDrawing = useCallback((id: string, updates: Partial<DrawingObject>) => {
    onUpdateDrawing(id, updates);
    // If style is being updated, save it as new default
    if (updates.style) {
      saveDrawingDefaults(updates.style);
    }
  }, [onUpdateDrawing, saveDrawingDefaults]);

  return (
    <div className="relative w-full h-full group" onContextMenu={e => e.preventDefault()}>
        {selectedDrawing && popupPos && (
            <DrawingSettingsPopup 
                drawing={selectedDrawing} 
                position={{ x: popupPos.x + 20, y: popupPos.y - 40 }} 
                onUpdate={handleUpdateDrawing}
                onDelete={(id) => { onDeleteDrawing(id); setSelectedDrawingId(null); }}
                onDuplicate={(d) => onAddDrawing({...d, id: Date.now().toString(), start: {...d.start, time: d.start.time + 3600}, end: {...d.end, time: d.end.time + 3600}})}
                onClose={() => setSelectedDrawingId(null)}
            />
        )}
        
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 pointer-events-none text-xs font-mono">
             <h1 className="text-sm sm:text-base font-bold text-white mb-0.5 sm:mb-1 tracking-wider">{symbol} <span className="text-gray-500 hidden sm:inline">•</span> <span className="hidden sm:inline">{chartType}</span> <span className="text-blue-400">{data.length > 0 && data[data.length-1]?.close != null ? data[data.length-1].close.toFixed(2) : ''}</span></h1>
             <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 mt-0.5 sm:mt-1">
                {ohlc && (
                    <div className="flex space-x-2 sm:space-x-3 text-[10px] sm:text-[11px]">
                        <span className="text-gray-500">O <span className="text-white">{ohlc.o}</span></span>
                        <span className="text-gray-500">H <span className="text-white">{ohlc.h}</span></span>
                        <span className="text-gray-500">L <span className="text-white">{ohlc.l}</span></span>
                        <span className="text-gray-500">C <span className="text-white">{ohlc.c}</span></span>
                        <span className={`${ohlc.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{ohlc.change >= 0 ? '+' : ''}{ohlc.change.toFixed(2)}%</span>
                    </div>
                )}
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs bg-[#111] px-1.5 sm:px-2 py-0.5 rounded border border-[#333] w-fit">
                    <span className="text-gray-500 uppercase text-[8px] sm:text-[10px]">Close</span>
                    <span className={`font-mono ${timeLeft === '00:00' ? 'text-orange-400' : 'text-gray-300'}`}>{timeLeft}</span>
                </div>
            </div>
            
            {/* Trade Buttons & Indicators */}
            <div className="flex flex-col gap-1 mt-2 pointer-events-auto">
                {/* Trade Buttons Row */}
                {onBuy && onSell && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onSell}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium rounded transition-colors"
                        >
                            <span>Sell</span>
                            <span className="font-mono text-[10px] opacity-90">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </button>
                        <button
                            onClick={onBuy}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-[11px] font-medium rounded transition-colors"
                        >
                            <span>Buy</span>
                            <span className="font-mono text-[10px] opacity-90">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </button>
                    </div>
                )}
                
                {/* Indicators Button with dropdown (below trade buttons) */}
                <div className="relative">
                    <button
                        onClick={() => setShowActiveIndicatorsMenu(!showActiveIndicatorsMenu)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-[#111]/90 border border-[#333] rounded text-[11px] text-gray-300 hover:text-white hover:border-gray-500 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Indicators</span>
                        <span className="text-gray-500 text-[10px]">
                            ({indicators.filter(i => i.active).length + 
                              (chartIndicatorSettings?.volumeProfile?.enabled ? 1 : 0) +
                              (chartIndicatorSettings?.vwap?.enabled ? 1 : 0) +
                              (chartIndicatorSettings?.bollinger?.enabled ? 1 : 0) +
                              (chartIndicatorSettings?.volume?.enabled ? 1 : 0)})
                        </span>
                        <svg className={`w-3 h-3 transition-transform ${showActiveIndicatorsMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showActiveIndicatorsMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActiveIndicatorsMenu(false)} />
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[#0a0a0a] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="p-2 border-b border-[var(--border-color)] flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Active Indicators</span>
                                    <button
                                        onClick={() => { setShowActiveIndicatorsMenu(false); setShowIndicatorsModal(true); }}
                                        className="text-[10px] text-[var(--accent-blue)] hover:text-blue-400 flex items-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add
                                    </button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {/* SMA/EMA/RSI */}
                                    {indicators.filter(ind => ind.active).map(ind => (
                                        <div key={ind.id} className="flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] border-b border-[#1a1a1a]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: ind.color }} />
                                                <span className="text-xs text-white">{ind.type}({ind.period})</span>
                                            </div>
                                            {onToggleIndicator && (
                                                <button 
                                                    onClick={() => onToggleIndicator(ind.id)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {/* Volume Profile */}
                                    {chartIndicatorSettings?.volumeProfile?.enabled && (
                                        <div className="flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] border-b border-[#1a1a1a]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-blue-500" />
                                                <span className="text-xs text-white">Volume Profile</span>
                                            </div>
                                            {onChartIndicatorToggle && (
                                                <button 
                                                    onClick={() => onChartIndicatorToggle('volumeProfile', false)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* VWAP */}
                                    {chartIndicatorSettings?.vwap?.enabled && (
                                        <div className="flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] border-b border-[#1a1a1a]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartIndicatorSettings.vwap.color }} />
                                                <span className="text-xs text-white">VWAP</span>
                                            </div>
                                            {onChartIndicatorToggle && (
                                                <button 
                                                    onClick={() => onChartIndicatorToggle('vwap', false)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Bollinger */}
                                    {chartIndicatorSettings?.bollinger?.enabled && (
                                        <div className="flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] border-b border-[#1a1a1a]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: chartIndicatorSettings.bollinger.color }} />
                                                <span className="text-xs text-white">Bollinger({chartIndicatorSettings.bollinger.period})</span>
                                            </div>
                                            {onChartIndicatorToggle && (
                                                <button 
                                                    onClick={() => onChartIndicatorToggle('bollinger', false)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Volume */}
                                    {chartIndicatorSettings?.volume?.enabled && (
                                        <div className="flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-amber-500" />
                                                <span className="text-xs text-white">Volume</span>
                                            </div>
                                            {onChartIndicatorToggle && (
                                                <button 
                                                    onClick={() => onChartIndicatorToggle('volume', false)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Empty state */}
                                    {indicators.filter(i => i.active).length === 0 && 
                                     !chartIndicatorSettings?.volumeProfile?.enabled &&
                                     !chartIndicatorSettings?.vwap?.enabled &&
                                     !chartIndicatorSettings?.bollinger?.enabled &&
                                     !chartIndicatorSettings?.volume?.enabled && (
                                        <div className="px-3 py-4 text-center text-xs text-gray-500">
                                            No active indicators
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>

        {/* Chart container */}
        <div 
            ref={chartContainerRef} 
            className={`w-full h-full ${activeTool !== 'cursor' ? 'touch-none' : 'touch-auto'}`}
            onMouseDown={(e) => {
                if (activeTool !== 'cursor' || drawings.length > 0) {
                    handleMouseDown(e);
                }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => {
                // Only handle touch for drawing tools, let chart handle otherwise
                if (activeTool !== 'cursor') {
                    e.preventDefault();
                    handleMouseDown(e as any);
                } else if (drawings.length > 0) {
                    // Check if touching a drawing
                    const touch = e.touches[0];
                    const rect = chartContainerRef.current?.getBoundingClientRect();
                    if (rect) {
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;
                        const hit = hitTest(x, y);
                        if (hit) {
                            e.preventDefault();
                            handleMouseDown(e as any);
                        }
                    }
                }
            }}
            onTouchMove={(e) => {
                if (dragState || isDrawing) {
                    e.preventDefault();
                    handleMouseMove(e as any);
                }
            }}
            onTouchEnd={(e) => {
                if (dragState || isDrawing) {
                    e.preventDefault();
                    // Use last touch position for touchend
                    const lastTouch = (e as React.TouchEvent).changedTouches?.[0];
                    if (lastTouch && chartContainerRef.current) {
                        const rect = chartContainerRef.current.getBoundingClientRect();
                        const fakeEvent = {
                            clientX: lastTouch.clientX,
                            clientY: lastTouch.clientY,
                            touches: [lastTouch],
                            stopPropagation: () => {},
                        } as any;
                        handleMouseUp(fakeEvent);
                    } else {
                        handleMouseUp(e as any);
                    }
                }
            }}
        />
        
        {/* Canvas overlay for drawings - always pointer-events none */}
        <canvas 
            ref={canvasRef} 
            className="absolute top-0 left-0 z-10 w-full h-full pointer-events-none"
        />
        
        {/* Indicators Modal */}
        {showIndicatorsModal && (
            <>
                <div className="fixed inset-0 bg-black/60 z-[200]" onClick={() => setShowIndicatorsModal(false)} />
                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] max-h-[80vh] bg-[#0a0a0a] border border-[var(--border-color)] rounded-xl shadow-2xl z-[201] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                        <h2 className="text-white font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Indicators
                        </h2>
                        <button 
                            onClick={() => setShowIndicatorsModal(false)}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {/* Moving Averages */}
                        <div>
                            <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Moving Averages</h3>
                            <div className="space-y-2">
                                {indicators.map(ind => (
                                    <div 
                                        key={ind.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                            ind.active 
                                                ? 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/50' 
                                                : 'bg-[#111] border-[#222] hover:border-[#333]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ background: `linear-gradient(135deg, ${ind.color}, ${ind.color}88)` }}
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{ind.type}({ind.period})</p>
                                                <p className="text-[10px] text-gray-500">
                                                    {ind.type === 'SMA' ? 'Simple Moving Average' : 
                                                     ind.type === 'EMA' ? 'Exponential Moving Average' : 
                                                     'Relative Strength Index'}
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={ind.active}
                                                onChange={() => onToggleIndicator?.(ind.id)}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Chart Overlays */}
                        <div>
                            <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Chart Overlays</h3>
                            <div className="space-y-2">
                                {/* Volume Profile */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    chartIndicatorSettings?.volumeProfile?.enabled 
                                        ? 'bg-blue-500/10 border-blue-500/50' 
                                        : 'bg-[#111] border-[#222] hover:border-[#333]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Volume Profile</p>
                                            <p className="text-[10px] text-gray-500">Volume at price levels</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={chartIndicatorSettings?.volumeProfile?.enabled ?? false}
                                            onChange={(e) => onChartIndicatorToggle?.('volumeProfile', e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>
                                
                                {/* VWAP */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    chartIndicatorSettings?.vwap?.enabled 
                                        ? 'bg-purple-500/10 border-purple-500/50' 
                                        : 'bg-[#111] border-[#222] hover:border-[#333]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">VWAP</p>
                                            <p className="text-[10px] text-gray-500">Volume Weighted Average Price</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={chartIndicatorSettings?.vwap?.enabled ?? false}
                                            onChange={(e) => onChartIndicatorToggle?.('vwap', e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>
                                
                                {/* Bollinger Bands */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    chartIndicatorSettings?.bollinger?.enabled 
                                        ? 'bg-green-500/10 border-green-500/50' 
                                        : 'bg-[#111] border-[#222] hover:border-[#333]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Bollinger Bands</p>
                                            <p className="text-[10px] text-gray-500">Volatility bands</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={chartIndicatorSettings?.bollinger?.enabled ?? false}
                                            onChange={(e) => onChartIndicatorToggle?.('bollinger', e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        {/* Lower Indicators */}
                        <div>
                            <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Lower Panels</h3>
                            <div className="space-y-2">
                                {/* Volume */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    chartIndicatorSettings?.volume?.enabled 
                                        ? 'bg-amber-500/10 border-amber-500/50' 
                                        : 'bg-[#111] border-[#222] hover:border-[#333]'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Volume</p>
                                            <p className="text-[10px] text-gray-500">Trading volume bars</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={chartIndicatorSettings?.volume?.enabled ?? false}
                                            onChange={(e) => onChartIndicatorToggle?.('volume', e.target.checked)}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-blue)]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => setShowIndicatorsModal(false)}
                            className="w-full py-2 bg-[var(--accent-blue)] text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default Chart;
