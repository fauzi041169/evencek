import React, { useState, useEffect, useRef } from 'react';

export default function EditableText({
    value,
    onChange,
    isEditing,
    className = '',
    tagName = 'div',
    placeholder = 'Ketik di sini...',
    ...props
}) {
    const Tag = tagName;
    const [localValue, setLocalValue] = useState(value ?? '');
    const elementRef = useRef(null);

    useEffect(() => {
        setLocalValue(value ?? '');
        if (elementRef.current && isEditing && elementRef.current.innerText !== (value ?? '')) {
            elementRef.current.innerText = value ?? '';
        }
    }, [value, isEditing]);

    const handleBlur = (e) => {
        const newValue = (e.currentTarget.innerText || '').trim();
        setLocalValue(newValue);
        if (onChange && newValue !== (value ?? '').trim()) {
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
                className={`${className} outline-dashed outline-2 outline-amber-400/70 hover:outline-amber-400 rounded px-1 transition-all min-w-[1em] empty:before:content-[attr(data-placeholder)] empty:before:text-white/40 cursor-text relative z-20`}
                data-placeholder={placeholder}
                {...props}
            >
                {localValue}
            </Tag>
        );
    }

    return (
        <Tag className={className} {...props}>
            {value}
        </Tag>
    );
}
