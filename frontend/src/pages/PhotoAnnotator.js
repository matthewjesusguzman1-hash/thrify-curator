import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, Upload, Pencil, Circle, ArrowUp, Type, Undo2, Download, Trash2, Save, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const COLORS = ["#FF0000", "#FFFF00", "#00FF00", "#0088FF", "#FF00FF", "#FFFFFF", "#000000"];
const TOOLS = [
  { id: "freehand", icon: Pencil, label: "Draw" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "arrow", icon: ArrowUp, label: "Arrow" },
  { id: "text", icon: Type, label: "Text" },
];

export default function PhotoAnnotator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState("freehand");
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [lastPos, setLastPos] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPlacePos, setTextPlacePos] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  /* Load image */
  const loadImage = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const container = containerRef.current;
        if (!container) return;
        const maxW = container.clientWidth;
        const maxH = window.innerHeight * 0.55;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        setImgDimensions({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
        setHistory([]);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  /* Redraw */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    canvas.width = imgDimensions.w;
    canvas.height = imgDimensions.h;
    ctx.drawImage(image, 0, 0, imgDimensions.w, imgDimensions.h);

    for (const item of history) {
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (item.type === "freehand" && item.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) ctx.lineTo(item.points[i].x, item.points[i].y);
        ctx.stroke();
      } else if (item.type === "circle") {
        const dx = item.end.x - item.start.x;
        const dy = item.end.y - item.start.y;
        ctx.beginPath();
        ctx.arc(item.start.x, item.start.y, Math.sqrt(dx * dx + dy * dy), 0, Math.PI * 2);
        ctx.stroke();
      } else if (item.type === "arrow") {
        const angle = Math.atan2(item.end.y - item.start.y, item.end.x - item.start.x);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(item.start.x, item.start.y);
        ctx.lineTo(item.end.x, item.end.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(item.end.x, item.end.y);
        ctx.lineTo(item.end.x - headLen * Math.cos(angle - Math.PI / 6), item.end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(item.end.x, item.end.y);
        ctx.lineTo(item.end.x - headLen * Math.cos(angle + Math.PI / 6), item.end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (item.type === "text") {
        const fs = item.fontSize || 16;
        ctx.font = `bold ${fs}px sans-serif`;
        const metrics = ctx.measureText(item.text);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(item.pos.x - 2, item.pos.y - fs + 2, metrics.width + 4, fs + 4);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.pos.x, item.pos.y);
      }
    }
  }, [image, imgDimensions, history]);

  useEffect(() => { redraw(); }, [redraw]);

  /* Canvas position helper */
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  /* Check if a text item was tapped */
  const findTextAt = (pos) => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const ctx = canvas.getContext("2d");
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      if (item.type !== "text") continue;
      const fs = item.fontSize || 16;
      ctx.font = `bold ${fs}px sans-serif`;
      const w = ctx.measureText(item.text).width + 4;
      const h = fs + 4;
      if (pos.x >= item.pos.x - 2 && pos.x <= item.pos.x - 2 + w && pos.y >= item.pos.y - fs + 2 && pos.y <= item.pos.y - fs + 2 + h) {
        return i;
      }
    }
    return -1;
  };

  /* Pointer down */
  const onPointerDown = (e) => {
    if (!image) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (!pos) return;

    // Text tool: place text
    if (tool === "text") {
      setTextPlacePos(pos);
      setShowTextInput(true);
      return;
    }

    // Check if tapping on existing text to drag
    const idx = findTextAt(pos);
    if (idx >= 0) {
      const item = history[idx];
      setDragIdx(idx);
      setDragOffset({ x: pos.x - item.pos.x, y: pos.y - item.pos.y });
      return;
    }

    setIsDrawing(true);
    setDrawStart(pos);
    setLastPos(pos);

    if (tool === "freehand") {
      setHistory(prev => [...prev, { type: "freehand", color, lineWidth, points: [pos] }]);
    }
  };

  /* Pointer move */
  const onPointerMove = (e) => {
    if (!image) return;
    const pos = getCanvasPos(e);
    if (!pos) return;

    // Dragging text
    if (dragIdx !== null) {
      e.preventDefault();
      setHistory(prev => {
        const next = [...prev];
        next[dragIdx] = { ...next[dragIdx], pos: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } };
        return next;
      });
      return;
    }

    if (!isDrawing) return;
    e.preventDefault();
    setLastPos(pos);

    if (tool === "freehand") {
      setHistory(prev => {
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        last.points = [...last.points, pos];
        next[next.length - 1] = last;
        return next;
      });
    }
  };

  /* Pointer up */
  const onPointerUp = (e) => {
    if (dragIdx !== null) {
      setDragIdx(null);
      return;
    }
    if (!isDrawing || !image) return;
    setIsDrawing(false);

    const pos = getCanvasPos(e) || lastPos;

    if ((tool === "circle" || tool === "arrow") && drawStart && pos) {
      setHistory(prev => [...prev, { type: tool, color, lineWidth, start: drawStart, end: pos }]);
    }
    setDrawStart(null);
    setLastPos(null);
  };

  const addText = () => {
    if (!textInput.trim() || !textPlacePos) return;
    setHistory(prev => [...prev, { type: "text", color, text: textInput.trim(), pos: textPlacePos, fontSize: 16 }]);
    setTextInput("");
    setTextPlacePos(null);
    setShowTextInput(false);
  };

  const undo = () => setHistory(prev => prev.slice(0, -1));
  const clearAll = () => setHistory([]);

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `inspection-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Photo saved to downloads");
  };

  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "inspection-photo.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        downloadImage();
      }
    } catch {
      downloadImage();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1729]" data-testid="photo-annotator">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#002855] border-b border-[#D4AF37]/20 px-3 py-2">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white p-1" data-testid="back-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Photo Annotation</h1>
              <p className="text-[10px] text-white/50">Annotate inspection photos</p>
            </div>
          </div>
          {image && (
            <div className="flex items-center gap-1">
              <Button onClick={shareImage} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2 text-xs" data-testid="save-photo-btn">
                <Save className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
              <Button onClick={downloadImage} variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2 text-xs" data-testid="download-photo-btn">
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4 pb-24 space-y-3" ref={containerRef}>
        {/* Upload / Camera */}
        {!image && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button onClick={() => cameraInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[#D4AF37]/40 bg-[#002855]/30 hover:bg-[#002855]/50 transition-colors" data-testid="take-photo-btn">
                <Camera className="w-8 h-8 text-[#D4AF37]" />
                <span className="text-xs font-semibold text-white/80">Take Photo</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[#D4AF37]/40 bg-[#002855]/30 hover:bg-[#002855]/50 transition-colors" data-testid="upload-photo-btn">
                <Upload className="w-8 h-8 text-[#D4AF37]" />
                <span className="text-xs font-semibold text-white/80">Upload Photo</span>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && loadImage(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && loadImage(e.target.files[0])} />
            <p className="text-[11px] text-white/40 text-center">Take a photo or upload one to start annotating. Draw circles, arrows, text, and freehand to document findings.</p>
          </div>
        )}

        {/* Canvas area */}
        {image && (
          <>
            {/* Zoom controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={zoomOut} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white" data-testid="zoom-out-btn"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-[10px] text-white/50 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white" data-testid="zoom-in-btn"><ZoomIn className="w-4 h-4" /></button>
                {zoom !== 1 && <button onClick={resetZoom} className="text-[10px] text-[#D4AF37] ml-1">Reset</button>}
              </div>
              <p className="text-[9px] text-white/30">Tap text to drag it</p>
            </div>

            {/* Canvas wrapper — scrollable/zoomable */}
            <div className="rounded-lg border border-white/10 bg-black overflow-auto" style={{ maxHeight: "60vh" }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: imgDimensions.w, height: imgDimensions.h }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: imgDimensions.w, height: imgDimensions.h, display: "block", touchAction: "none", cursor: tool === "text" ? "crosshair" : "default" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={() => { if (isDrawing) { setIsDrawing(false); if ((tool === "circle" || tool === "arrow") && drawStart && lastPos) { setHistory(prev => [...prev, { type: tool, color, lineWidth, start: drawStart, end: lastPos }]); } setDrawStart(null); setLastPos(null); } if (dragIdx !== null) setDragIdx(null); }}
                  data-testid="annotation-canvas"
                />
              </div>
            </div>

            {/* Text input overlay */}
            {showTextInput && (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addText()}
                  placeholder="Type annotation text..."
                  className="flex-1 px-2.5 py-2 rounded-lg border border-[#D4AF37] bg-[#0B1729] text-white text-xs placeholder:text-white/40 focus:ring-1 focus:ring-[#D4AF37] outline-none"
                  autoFocus
                  data-testid="text-annotation-input"
                />
                <button onClick={addText} className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#002855] text-xs font-bold" data-testid="add-text-btn">Add</button>
                <button onClick={() => { setShowTextInput(false); setTextPlacePos(null); }} className="px-2 py-2 rounded-lg bg-white/10 text-white text-xs">Cancel</button>
              </div>
            )}

            {/* Toolbar */}
            <div className="bg-[#002855]/80 rounded-xl p-3 space-y-2.5 border border-white/10">
              {/* Tools */}
              <div className="flex gap-1.5">
                {TOOLS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                      tool === t.id ? "bg-[#D4AF37] text-[#002855]" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                    data-testid={`tool-${t.id}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Colors */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-medium">Color:</span>
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-[#D4AF37] scale-110" : "border-white/20"}`}
                      style={{ backgroundColor: c }}
                      data-testid={`color-${c.replace("#", "")}`}
                    />
                  ))}
                </div>
              </div>

              {/* Line width */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-medium">Size:</span>
                <input type="range" min="1" max="8" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="flex-1 h-1 accent-[#D4AF37]" data-testid="line-width-slider" />
                <span className="text-[10px] text-white/40 w-4 text-center">{lineWidth}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button onClick={undo} disabled={history.length === 0} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-[10px] font-semibold disabled:opacity-30 transition-all" data-testid="undo-btn">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={clearAll} disabled={history.length === 0} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-[10px] font-semibold disabled:opacity-30 transition-all" data-testid="clear-all-btn">
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
                <button onClick={() => { setImage(null); setHistory([]); setZoom(1); setPan({x:0,y:0}); }} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-[10px] font-semibold transition-all" data-testid="new-photo-btn">
                  <Camera className="w-3.5 h-3.5" /> New Photo
                </button>
              </div>
            </div>

            {/* Quick stamps */}
            <div className="bg-[#002855]/50 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-white/40 font-medium mb-2">Quick stamps — tap a stamp, then tap on photo to place:</p>
              <div className="flex flex-wrap gap-1.5">
                {["VIOLATION", "OOS", "DEFECT", new Date().toLocaleDateString(), "SEE REPORT"].map(stamp => (
                  <button
                    key={stamp}
                    onClick={() => {
                      setTool("text");
                      setTextInput(stamp);
                      toast.info("Tap on the photo to place text");
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-white/5 text-white/60 hover:bg-[#D4AF37] hover:text-[#002855] text-[10px] font-bold transition-all"
                    data-testid={`stamp-${stamp.toLowerCase().replace(/[^a-z]/g, "-")}`}
                  >
                    {stamp}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
