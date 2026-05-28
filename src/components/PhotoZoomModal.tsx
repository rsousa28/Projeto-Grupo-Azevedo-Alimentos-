import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Move } from 'lucide-react';

interface PhotoZoomModalProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export const PhotoZoomModal: React.FC<PhotoZoomModalProps> = ({
  isOpen,
  src,
  alt = 'Evidência Fotográfica',
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset state when opening a new picture or closing
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, src]);

  // Handle keyboard events (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleZoomWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.25, 5));
    } else {
      setScale(prev => Math.max(prev - 0.25, 0.5));
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2.5);
    }
  };

  // Human dragging logic for standard HTML movement
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return; // Only allow dragging when zoomed in
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.current.x;
    const nextY = e.clientY - dragStart.current.y;
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-between p-4 md:p-6 backdrop-blur-md select-none touch-none"
        >
          {/* Top Bar Controls */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFCB05] italic block">Visualizador Avançado</span>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{alt}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 shadow-lg border border-white/5 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Picture Container Screen */}
          <div 
            className="flex-1 w-full flex items-center justify-center overflow-hidden relative"
            onWheel={handleZoomWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div 
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              className="transition-transform duration-75 ease-out relative flex items-center justify-center max-w-full max-h-[70vh]"
            >
              <motion.img
                key={src}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  scale: scale,
                  rotate: `${rotation}deg`
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                src={src}
                alt={alt}
                onDoubleClick={handleDoubleClick}
                className="max-w-[90vw] max-h-[70vh] rounded-2xl md:rounded-3xl object-contain shadow-2xl border border-white/10 pointer-events-none"
                referrerPolicy="no-referrer"
              />
              
              {scale > 1 && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-[10px] font-black text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 animate-pulse" /> ARRASTE PARA MOVER
                </div>
              )}
            </div>
          </div>

          {/* Floating Pill Toolbar Bottom */}
          <div className="z-10 bg-zinc-900/90 border border-white/10 backdrop-blur-md px-5 py-3 rounded-3xl flex items-center gap-4 shadow-2xl max-w-md w-auto">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent active:scale-90 cursor-pointer"
              title="Afastar"
            >
              <ZoomOut className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="w-14 text-center font-mono text-[11px] font-black text-[#FFCB05] tracking-widest">
              {Math.round(scale * 100)}%
            </div>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent active:scale-90 cursor-pointer"
              title="Aproximar"
            >
              <ZoomIn className="w-5 h-5 stroke-[2]" />
            </button>

            <span className="h-4 w-[1px] bg-white/15" />

            <button
              onClick={handleRotate}
              className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Rotacionar 90º"
            >
              <RotateCw className="w-4.5 h-4.5 stroke-[2]" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Resetar Ajustes"
            >
              <RefreshCw className="w-4.5 h-4.5 stroke-[2]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
