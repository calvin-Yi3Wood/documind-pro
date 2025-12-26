/**
 * Spinner Component - 加载动画组件
 *
 * 支持多种尺寸和样式
 * 使用暖铜色系设计
 */

import React from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'white';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  fullScreen?: boolean;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4'
};

const variantStyles: Record<SpinnerVariant, string> = {
  primary: 'border-orange-500 border-t-transparent',
  secondary: 'border-bronze-400 border-t-transparent',
  white: 'border-white border-t-transparent'
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  label,
  fullScreen = false
}) => {
  const spinnerElement = (
    <div
      className={`inline-block rounded-full animate-spin ${sizeStyles[size]} ${variantStyles[variant]}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cream-50/80 backdrop-blur-sm">
        {spinnerElement}
        {label && (
          <p className="mt-4 text-sm text-bronze-600 font-medium">
            {label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3">
      {spinnerElement}
      {label && (
        <span className="text-sm text-bronze-600">
          {label}
        </span>
      )}
    </div>
  );
};

/**
 * Overlay Spinner - 覆盖在容器上的加载动画
 */
export interface OverlaySpinnerProps {
  loading: boolean;
  children: React.ReactNode;
  label?: string;
}

export const OverlaySpinner: React.FC<OverlaySpinnerProps> = ({
  loading,
  children,
  label
}) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-cream-50/80 backdrop-blur-sm rounded-lg">
          <Spinner size="lg" {...(label !== undefined ? { label } : {})} />
        </div>
      )}
    </div>
  );
};
