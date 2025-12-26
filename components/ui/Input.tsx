/**
 * Input Component - 输入框组件
 *
 * 支持多种类型、前缀/后缀图标、错误状态
 * 使用暖铜色系设计
 */

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const hasError = Boolean(error);

    const baseInputStyles = 'block px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2';
    const errorStyles = hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
      : 'border-bronze-200 focus:border-orange-500 focus:ring-orange-500/20';
    const bgStyles = 'bg-cream-50 text-bronze-800 placeholder:text-bronze-400';
    const disabledStyles = 'disabled:bg-bronze-100 disabled:cursor-not-allowed disabled:opacity-50';

    const widthStyle = fullWidth ? 'w-full' : '';
    const paddingStyles = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

    const inputClassName = `${baseInputStyles} ${errorStyles} ${bgStyles} ${disabledStyles} ${widthStyle} ${paddingStyles} ${className}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-bronze-700 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bronze-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClassName}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-bronze-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden="true" />
            {error}
          </p>
        )}

        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-bronze-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
