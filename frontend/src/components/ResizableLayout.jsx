import { useState, useEffect, useRef, useCallback } from 'react';

// ── Resizable Divider ─────────────────────────────────────────────────────────
const ResizableDivider = ({ onResize, minLeft, minRight, containerRef, isCollapsed, onToggleCollapse }) => {
  const dividerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    if (isCollapsed) return; // Don't allow dragging when collapsed
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isCollapsed]);

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
      onDoubleClick={onToggleCollapse}
      className={`group flex-shrink-0 w-3 flex flex-col items-center justify-center
        rounded-full transition-colors mx-1 self-stretch gap-2
        ${isCollapsed 
          ? 'cursor-pointer hover:bg-indigo-100' 
          : 'cursor-col-resize hover:bg-indigo-100 active:bg-indigo-200'
        }`}
      title={isCollapsed ? "Click to expand left panel" : "Drag to resize • Double-click to collapse"}
    >
      {/* Collapse/Expand button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        className="w-5 h-5 rounded-full bg-slate-200 hover:bg-indigo-400 
          flex items-center justify-center transition-colors
          text-slate-500 hover:text-white text-[10px]"
        title={isCollapsed ? "Expand panel" : "Collapse panel"}
      >
        {isCollapsed ? '→' : '←'}
      </button>
      
      {/* Drag handle line */}
      <div className={`w-0.5 h-12 rounded-full transition-colors
        ${isCollapsed 
          ? 'bg-slate-200' 
          : 'bg-slate-300 group-hover:bg-indigo-400 group-active:bg-indigo-500'
        }`} 
      />
    </div>
  );
};

// ── Resizable Layout Container ────────────────────────────────────────────────
const ResizableLayout = ({ 
  leftPanel, 
  leftPanelCollapsed,  // Collapsed version of left panel (icons only)
  rightPanel, 
  minLeftWidth = 400, 
  minRightWidth = 300,
  defaultRightWidth = 460,
  collapsedLeftWidth = 60,
  showRightPanel = true,
}) => {
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const containerRef = useRef(null);

  const handleToggleCollapse = useCallback(() => {
    setIsLeftCollapsed(prev => !prev);
  }, []);

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
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isLeftCollapsed ? 'overflow-hidden' : 'min-w-0 flex-1'
        }`}
        style={{ 
          width: isLeftCollapsed ? `${collapsedLeftWidth}px` : undefined,
          minWidth: isLeftCollapsed ? `${collapsedLeftWidth}px` : undefined,
          maxWidth: isLeftCollapsed ? `${collapsedLeftWidth}px` : undefined,
          marginRight: '0.5rem',
        }}
      >
        {isLeftCollapsed && leftPanelCollapsed ? leftPanelCollapsed : leftPanel}
      </div>

      {/* Resizable Divider */}
      <ResizableDivider 
        onResize={setRightWidth} 
        minLeft={minLeftWidth} 
        minRight={minRightWidth}
        containerRef={containerRef}
        isCollapsed={isLeftCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Right Panel - sticky with internal scroll */}
      <div 
        className={`flex-shrink-0 sticky top-6 flex flex-col transition-all duration-300 ease-in-out`}
        style={{ 
          width: isLeftCollapsed ? `calc(100% - ${collapsedLeftWidth}px - 24px)` : `${rightWidth}px`, 
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
