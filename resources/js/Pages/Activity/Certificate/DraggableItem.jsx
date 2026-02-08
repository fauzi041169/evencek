import React, { useRef, useEffect, Suspense } from 'react';
const LazyMoveable = React.lazy(() => import('react-moveable'));

export default function DraggableItem({
    id,
    isSelected,
    data,
    onSelect,
    onChange,
    children,
    isResizable = false,
    parentContainer
}) {
    const targetRef = useRef(null);
    const isDraggingRef = useRef(false);

    // Initial styles from data
    const style = {
        position: 'absolute',
        left: `${data.left}px`,
        top: `${data.top}px`,
        width: data.width ? `${data.width}px` : 'auto',
        height: data.height ? `${data.height}px` : 'auto',
        fontSize: data.size ? `${data.size}px` : 'inherit',
        fontFamily: data.font || 'inherit',
        color: data.color || '#000',
        fontWeight: data.weight || 'normal',
        fontStyle: data.italic || 'normal',
        textAlign: data.align || 'left',
        zIndex: isSelected ? 100 : 10,
        cursor: isSelected ? 'move' : 'pointer', // Change cursor for clarity
        border: isSelected ? '1px dashed #bfa100' : '1px solid transparent', // Visual feedback
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        lineHeight: 1.2,
        userSelect: 'none', // Prevent text selection while dragging
    };

    const handleClick = (e) => {
        e.stopPropagation();
        // Only select if we are NOT dragging
        if (!isDraggingRef.current) {
            onSelect(id);
        }
        isDraggingRef.current = false;
    };

    return (
        <>
            <div
                ref={targetRef}
                className={`draggable-item ${id}`}
                style={style}
                onClick={handleClick}
            >
                {children}
            </div>

            {isSelected && targetRef.current && (
                <Suspense fallback={null}>
                    <LazyMoveable
                        target={targetRef.current}
                        container={parentContainer}
                        draggable={true}
                        resizable={isResizable}
                        snappable={true}
                        snapThreshold={5}
                        keepRatio={id === 'qr' || id === 'photo' || data.data_key === 'qr' || data.data_key === 'photo'}
                        throttleDrag={0}
                        throttleResize={0}
                        origin={false}
                        edge={false}
                        renderDirections={isResizable ? ["nw", "n", "ne", "w", "e", "sw", "s", "se"] : []}
                        onDragStart={() => {
                            isDraggingRef.current = true;
                        }}
                        onDrag={({ target, transform, left, top }) => {
                            target.style.left = `${left}px`;
                            target.style.top = `${top}px`;
                        }}
                        onDragEnd={({ target }) => {
                            const left = parseFloat(target.style.left);
                            const top = parseFloat(target.style.top);
                            onChange(id, { left, top });
                        }}
                        onResize={({ target, width, height, drag }) => {
                            if (!isResizable) return;
                            target.style.width = `${width}px`;
                            target.style.height = `${height}px`;
                            target.style.left = `${drag.left}px`;
                            target.style.top = `${drag.top}px`;
                        }}
                        onResizeEnd={({ target }) => {
                            if (!isResizable) return;
                            const width = parseFloat(target.style.width);
                            const height = parseFloat(target.style.height);
                            const left = parseFloat(target.style.left);
                            const top = parseFloat(target.style.top);
                            onChange(id, { width, height, left, top });
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
