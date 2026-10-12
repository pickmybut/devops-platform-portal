import { useState, useEffect, useRef, useCallback } from 'react';

// ── Resizable Divider ─────────────────────────────────────────────────────────
const ResizableDivider = ({ onResize, minLeft, minRight, containerRef }) => {
  const dividerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      
      const container = containerRef?.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      const newRightWidth = containerWidth - newLeftWidth - 12; // 12px for divider + gaps
      
      // Enforce minimum widths
      if (newLeftWidth >= minLeft && newRightWidth >= minRight) {
        onResize(newRightWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, minLeft, minRight, containerRef]);

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className="group flex-shrink-0 w-2 cursor-col-resize flex items-center justify-center
        hover:bg-indigo-100 active:bg-indigo-200 rounded-full transition-colors mx-1
        self-stretch"
      title="Drag to resize panels"
    >
      <div className="w-0.5 h-16 bg-slate-300 group-hover:bg-indigo-400 
        group-active:bg-indigo-500 rounded-full transition-colors" />
    </div>
  );
};

// ── Resizable Layout Container ────────────────────────────────────────────────
const ResizableLayout = ({ 
  leftPanel, 
  rightPanel, 
  minLeftWidth = 400, 
  minRightWidth = 300,
  defaultRightWidth = 460,
  showRightPanel = true,
}) => {
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const containerRef = useRef(null);

  // If no right panel, just render left panel full width
  if (!showRightPanel || !rightPanel) {
    return <div className="min-w-0 flex-1">{leftPanel}</div>;
  }

  return (
    <div 
      ref={containerRef} 
      className="flex items-stretch"
      style={{ minHeight: 'calc(100vh - 96px)' }}
    >
      {/* Left Panel - scrolls with page */}
      <div className="min-w-0 flex-1" style={{ marginRight: '0.5rem' }}>
        {leftPanel}
      </div>

      {/* Resizable Divider */}
      <ResizableDivider 
        onResize={setRightWidth} 
        minLeft={minLeftWidth} 
        minRight={minRightWidth}
        containerRef={containerRef}
      />

      {/* Right Panel - sticky with internal scroll */}
      <div 
        className="flex-shrink-0 sticky top-6 flex flex-col"
        style={{ 
          width: `${rightWidth}px`, 
          height: 'calc(100vh - 96px)',
          maxHeight: 'calc(100vh - 96px)',
        }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

export default ResizableLayout;
