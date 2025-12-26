/**
 * Dropdown Component - 下拉菜单组件
 *
 * 支持键盘导航、自动定位、可访问性
 * 使用暖铜色系设计
 */

import React, { useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  placement = 'bottom-start',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const validItems = items.filter(item => !item.disabled && !item.divider);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next >= validItems.length ? 0 : next;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next < 0 ? validItems.length - 1 : next;
          });
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          const selectedItem = validItems[focusedIndex];
          if (focusedIndex >= 0 && focusedIndex < validItems.length && selectedItem) {
            handleSelect(selectedItem.value);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, items]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const placementStyles = {
    'bottom-start': 'top-full left-0 mt-2',
    'bottom-end': 'top-full right-0 mt-2',
    'top-start': 'bottom-full left-0 mb-2',
    'top-end': 'bottom-full right-0 mb-2'
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute z-50 ${placementStyles[placement]} min-w-[200px] bg-cream-50 border border-bronze-200 rounded-lg shadow-xl py-1`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 h-px bg-bronze-200"
                  role="separator"
                />
              );
            }

            const isFocused = focusedIndex === items.filter(i => !i.disabled && !i.divider).indexOf(item);

            return (
              <button
                key={item.value}
                onClick={() => !item.disabled && handleSelect(item.value)}
                disabled={item.disabled}
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-bronze-700 hover:bg-bronze-50'}
                  ${isFocused ? 'bg-orange-50' : ''}
                `}
                role="menuitem"
                tabIndex={-1}
              >
                {item.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
