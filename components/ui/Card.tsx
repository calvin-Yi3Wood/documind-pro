/**
 * Card Component - 卡片容器组件
 *
 * 支持头部、底部、悬停效果
 * 使用暖铜色系设计
 */

import React from 'react';

export type CardVariant = 'default' | 'bordered' | 'elevated';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-cream-50 border border-bronze-200',
  bordered: 'bg-cream-50 border-2 border-bronze-300',
  elevated: 'bg-cream-50 border border-bronze-200 shadow-lg'
};

// Card component with compound component type
interface CardComponent extends React.FC<CardProps> {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
}

export const Card: CardComponent = ({
  children,
  variant = 'default',
  hoverable = false,
  clickable = false,
  onClick,
  className = ''
}) => {
  const baseStyles = 'rounded-xl overflow-hidden';
  const hoverStyles = hoverable ? 'transition-all duration-200 hover:shadow-xl hover:border-orange-400 hover:-translate-y-1' : '';
  const clickStyles = clickable || onClick ? 'cursor-pointer' : '';

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${clickStyles} ${className}`;

  return (
    <div
      className={combinedClassName}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className = ''
}) => {
  return (
    <div className={`px-6 py-4 border-b border-bronze-200 bg-gradient-to-r from-orange-50/50 to-amber-50/50 ${className}`}>
      {children || (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-bold text-bronze-800 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-bronze-600">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`px-6 py-4 border-t border-bronze-200 bg-bronze-50/30 ${className}`}>
      {children}
    </div>
  );
};

// Compound component pattern
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
