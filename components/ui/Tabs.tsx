/**
 * Tabs Component - 标签页组件
 *
 * 支持键盘导航、图标、可访问性
 * 使用暖铜色系设计
 */

import React, { useState, useEffect } from 'react';

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

export interface TabsProps {
  tabs: Tab[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  variant?: 'line' | 'card';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export interface TabPaneProps {
  children: React.ReactNode;
  tabKey: string;
}

const sizeStyles = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3'
};

// Tabs component with compound component type
interface TabsComponent extends React.FC<TabsProps> {
  Pane: React.FC<TabPaneProps>;
}

export const Tabs: TabsComponent = ({
  tabs,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  variant = 'line',
  size = 'md',
  fullWidth = false,
  children
}) => {
  const [activeKey, setActiveKey] = useState(
    controlledActiveKey || defaultActiveKey || tabs[0]?.key || ''
  );

  useEffect(() => {
    if (controlledActiveKey !== undefined) {
      setActiveKey(controlledActiveKey);
    }
  }, [controlledActiveKey]);

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;

    setActiveKey(key);
    onChange?.(key);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const validTabs = tabs.filter(tab => !tab.disabled);
    if (validTabs.length === 0) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (index + 1) % validTabs.length;
        const nextTab = validTabs[nextIndex];
        if (nextTab) handleTabClick(nextTab.key);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = (index - 1 + validTabs.length) % validTabs.length;
        const prevTab = validTabs[prevIndex];
        if (prevTab) handleTabClick(prevTab.key);
        break;

      case 'Home':
        e.preventDefault();
        const firstTab = validTabs[0];
        if (firstTab) handleTabClick(firstTab.key);
        break;

      case 'End':
        e.preventDefault();
        const lastTab = validTabs[validTabs.length - 1];
        if (lastTab) handleTabClick(lastTab.key);
        break;
    }
  };

  const renderTabList = () => {
    const tabListClass = variant === 'line'
      ? 'flex border-b-2 border-bronze-200'
      : 'flex bg-bronze-50 rounded-lg p-1';

    const widthClass = fullWidth ? 'flex-1' : '';

    return (
      <div className={tabListClass} role="tablist">
        {tabs.map((tab, index) => {
          const isActive = tab.key === activeKey;
          const tabClass = variant === 'line'
            ? `
                ${sizeStyles[size]} font-medium transition-all duration-200
                ${isActive
                  ? 'text-orange-600 border-b-2 border-orange-500 -mb-0.5'
                  : 'text-bronze-600 border-b-2 border-transparent hover:text-orange-500 hover:border-bronze-300'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${widthClass}
              `
            : `
                ${sizeStyles[size]} font-medium rounded-md transition-all duration-200
                ${isActive
                  ? 'bg-cream-50 text-orange-600 shadow-sm'
                  : 'text-bronze-600 hover:text-orange-500 hover:bg-bronze-100'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${widthClass}
              `;

          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              id={`tab-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              className={tabClass}
              onClick={() => handleTabClick(tab.key, tab.disabled)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTabPanes = () => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement<TabPaneProps>(child)) {
        const isActive = child.props.tabKey === activeKey;
        return (
          <div
            role="tabpanel"
            id={`tabpanel-${child.props.tabKey}`}
            aria-labelledby={`tab-${child.props.tabKey}`}
            hidden={!isActive}
            className={isActive ? '' : 'hidden'}
          >
            {child}
          </div>
        );
      }
      return child;
    });
  };

  return (
    <div>
      {renderTabList()}
      <div className="mt-4">
        {renderTabPanes()}
      </div>
    </div>
  );
};

export const TabPane: React.FC<TabPaneProps> = ({ children }) => {
  return <>{children}</>;
};

Tabs.Pane = TabPane;
