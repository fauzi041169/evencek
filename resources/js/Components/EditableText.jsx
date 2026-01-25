import React, { useState, useEffect, useRef } from 'react';

export default function EditableText({ 
    value, 
    onChange, 
    isEditing, 
    className = "", 
    tagName = "div", 
    placeholder = "Type here...",
    ...props 
}) {
    const Tag = tagName;
    const [localValue, setLocalValue] = useState(value);
    const elementRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = (e) => {
        const newValue = e.currentTarget.innerText;
        setLocalValue(newValue);
        if (onChange && newValue !== value) {
            onChange(newValue);
        }
    };

    if (isEditing) {
        return (
            <Tag
                ref={elementRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleBlur}
                className={`${className} outline-dashed outline-2 outline-amber-500/50 hover:outline-amber-500 p-1 rounded transition-all min-w-[1em] empty:before:content-[attr(data-placeholder)] cursor-text`}
                data-placeholder={placeholder}
                {...props}
            >
                {value}
            </Tag>
        );
    }

    // When not editing, render normally but handle HTML entities safely if needed
    // For now, we assume simple text. If value contains HTML, we might need dangerouslySetInnerHTML
    // But typically for this use case, text is text.
    return (
        <Tag className={className} {...props}>
            {value}
        </Tag>
    );
}
