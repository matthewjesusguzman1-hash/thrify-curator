import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, Upload, Pencil, Circle, ArrowUp, Type, Undo2, Download, Trash2, Save } from "lucide-react";
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
  const [startPos, setStartPos] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);

  /* Load image onto canvas */
  const loadImage = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const container = containerRef.current;
        if (!container) return;
        const maxW = container.clientWidth;
        const maxH = window.innerHeight * 0.6;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        setImgDimensions({ w, h });
        setHistory([]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  /* Redraw canvas */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    canvas.width = imgDimensions.w;
    canvas.height = imgDimensions.h;
    ctx.drawImage(image, 0, 0, imgDimensions.w, imgDimensions.h);
    // Replay history
    for (const item of history) {
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (item.type === "freehand" && item.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      } else if (item.type === "circle") {
        const dx = item.end.x - item.start.x;
        const dy = item.end.y - item.start.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(item.start.x, item.start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (item.type === "arrow") {
        const { start, end } = item;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (item.type === "text") {
        ctx.font = `bold ${item.fontSize || 16}px sans-serif`;
        // text background
        const metrics = ctx.measureText(item.text);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(item.pos.x - 2, item.pos.y - (item.fontSize || 16) + 2, metrics.width + 4, (item.fontSize || 16) + 4);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.pos.x, item.pos.y);
      }
    }
  }, [image, imgDimensions, history]);

  useEffect(() => { redraw(); }, [redraw]);

  /* Get position from event */
  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
      y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  /* Drawing handlers */
  const handleStart = (e) => {
    if (!image) return;
    e.preventDefault();
    const pos = getPos(e);

    if (tool === "text") {
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    if (tool === "freehand") {
      setHistory(prev => [...prev, { type: "freehand", color, lineWidth, points: [pos] }]);
    }
  };

  const handleMove = (e) => {
    if (!isDrawing || !image) return;
    e.preventDefault();
    const pos = getPos(e);

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

  const handleEnd = (e) => {
    if (!isDrawing || !image) return;
    e.preventDefault();
    setIsDrawing(false);

    if ((tool === "circle" || tool === "arrow") && startPos) {
      const pos = getPos(e.changedTouches ? e : e);
      // For touch end, use last known position
      let endPos = pos;
      if (e.changedTouches) {
        const rect = canvasRef.current.getBoundingClientRect();
        const touch = e.changedTouches[0];
        endPos = {
          x: ((touch.clientX - rect.left) / rect.width) * canvasRef.current.width,
          y: ((touch.clientY - rect.top) / rect.height) * canvasRef.current.height,
        };
      }
      setHistory(prev => [...prev, { type: tool, color, lineWidth, start: startPos, end: endPos }]);
    }
    setStartPos(null);
  };

  const addText = () => {
    if (!textInput.trim() || !textPos) return;
    setHistory(prev => [...prev, { type: "text", color, text: textInput.trim(), pos: textPos, fontSize: 16 }]);
    setTextInput("");
    setTextPos(null);
    setShowTextInput(false);
  };

  const undo = () => {
    setHistory(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    setHistory([]);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    link.download = `inspection-photo-${timestamp}.png`;
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

      <div className="max-w-3xl mx-auto px-3 py-4 pb-20 space-y-3" ref={containerRef}>
        {/* Upload / Camera section */}
        {!image && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[#D4AF37]/40 bg-[#002855]/30 hover:bg-[#002855]/50 transition-colors"
                data-testid="take-photo-btn"
              >
                <Camera className="w-8 h-8 text-[#D4AF37]" />
                <span className="text-xs font-semibold text-white/80">Take Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[#D4AF37]/40 bg-[#002855]/30 hover:bg-[#002855]/50 transition-colors"
                data-testid="upload-photo-btn"
              >
                <Upload className="w-8 h-8 text-[#D4AF37]" />
                <span className="text-xs font-semibold text-white/80">Upload Photo</span>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && loadImage(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && loadImage(e.target.files[0])} />
            <p className="text-[11px] text-white/40 text-center">Take a photo or upload one to start annotating. Add circles, arrows, text, and freehand drawings to document inspection findings.</p>
          </div>
        )}

        {/* Canvas */}
        {image && (
          <>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black" style={{ position: "relative", touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "auto", display: "block" }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={() => { if (isDrawing) handleEnd({ preventDefault: () => {} }); }}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                data-testid="annotation-canvas"
              />
              {/* Text input overlay */}
              {showTextInput && textPos && (
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
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
                  <button onClick={() => { setShowTextInput(false); setTextPos(null); }} className="px-2 py-2 rounded-lg bg-white/10 text-white text-xs">Cancel</button>
                </div>
              )}
            </div>

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
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="flex-1 h-1 accent-[#D4AF37]"
                  data-testid="line-width-slider"
                />
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
                <button onClick={() => { setImage(null); setHistory([]); }} className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-[10px] font-semibold transition-all" data-testid="new-photo-btn">
                  <Camera className="w-3.5 h-3.5" /> New Photo
                </button>
              </div>
            </div>

            {/* Quick text stamps */}
            <div className="bg-[#002855]/50 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-white/40 font-medium mb-2">Quick stamps (tap then tap on photo to place):</p>
              <div className="flex flex-wrap gap-1.5">
                {["VIOLATION", "OOS", "DEFECT", new Date().toLocaleDateString(), "SEE REPORT"].map(stamp => (
                  <button
                    key={stamp}
                    onClick={() => {
                      setTool("text");
                      setTextInput(stamp);
                      toast.info("Tap on the photo to place the text");
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
