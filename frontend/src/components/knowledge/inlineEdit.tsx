import React, { useEffect, useRef, useState } from 'react';

export function InlineEditableText({
  value,
  onChange,
  className,
  tag = 'div',
  dir,
  placeholder,
  disabled = false,
  onSelect,
  selected = false,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
  dir?: 'rtl' | 'ltr';
  placeholder?: string;
  disabled?: boolean;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const Tag: any = tag;
  const ref = useRef<any>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  useEffect(() => {
    if (!disabled && selected && editing) ref.current?.focus?.();
  }, [disabled, editing, selected]);

  return (
    <Tag
      ref={ref}
      dir={dir}
      className={className}
      contentEditable={!disabled && selected && editing}
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ''}
      onMouseDown={(e: any) => {
        if (disabled) return;
        e.stopPropagation();
        onSelect?.();
        setEditing(true);
      }}
      onInput={(e: any) => {
        if (disabled || !editing) return;
        onChange(e.currentTarget.innerText);
      }}
      onBlur={(e: any) => {
        if (disabled || !editing) return;
        setEditing(false);
        onChange(e.currentTarget.innerText);
      }}
      style={!disabled ? { cursor: 'text' } : undefined}
    >
      {value || placeholder || ''}
    </Tag>
  );
}

