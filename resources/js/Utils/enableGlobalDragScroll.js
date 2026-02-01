
/**
 * Enables "grab and drag" scrolling for all scrollable elements in the application.
 * Users can click anywhere on a scrollable container and drag to scroll.
 */
export const enableGlobalDragScroll = () => {
    let isDown = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;
    let activeElement = null;

    // Check if an element is scrollable
    const isScrollable = (el) => {
        if (!el || !el.getBoundingClientRect) return false;

        // Exclude specific elements that shouldn't initiate drag
        if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'A', 'VIDEO', 'CANVAS', 'OBJECT', 'EMBED', 'IFRAME'].includes(el.tagName)) {
            return false;
        }

        // Check computed styles for overflow
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;

        const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;

        return isScrollableY || isScrollableX;
    };

    // Find the closest scrollable ancestor
    const getScrollableParent = (node) => {
        if (!node || node === document.body || node === document.documentElement) {
            return null;
        }
        if (isScrollable(node)) {
            return node;
        }
        return getScrollableParent(node.parentNode);
    };

    const handleMouseDown = (e) => {
        // Allow normal interaction with form elements and clickable items
        if (e.target.closest('button, a, input, textarea, select, [role="button"], label')) {
            return;
        }

        const scrollable = getScrollableParent(e.target);
        if (!scrollable) return;

        // We found a scrollable element
        isDown = true;
        activeElement = scrollable;

        // Capture initial position
        startX = e.pageX;
        startY = e.pageY;
        scrollLeft = activeElement.scrollLeft;
        scrollTop = activeElement.scrollTop;
    };

    const handleMouseLeave = () => {
        if (isDown && activeElement) {
            activeElement.style.cursor = '';
            activeElement.style.userSelect = '';
        }
        isDown = false;
        activeElement = null;
    };

    const handleMouseUp = () => {
        if (isDown && activeElement) {
            activeElement.style.cursor = '';
            activeElement.style.userSelect = '';
        }
        isDown = false;
        activeElement = null;
    };

    const handleMouseMove = (e) => {
        if (!isDown || !activeElement) return;

        const x = e.pageX;
        const y = e.pageY;

        const walkX = x - startX;
        const walkY = y - startY;

        // Threshold to determine if it is a drag intention (vs a click)
        if (Math.abs(walkX) < 5 && Math.abs(walkY) < 5) return;

        // It is a drag, prevent default to avoid text selection
        e.preventDefault();

        activeElement.style.cursor = 'grabbing';
        activeElement.style.userSelect = 'none';

        activeElement.scrollLeft = scrollLeft - walkX;
        activeElement.scrollTop = scrollTop - walkY;
    };

    // Attach listeners to document
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    // Return cleanup function if needed (though we run this globally once)
    return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousemove', handleMouseMove);
    };
};
