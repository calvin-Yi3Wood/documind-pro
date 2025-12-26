/**
 * UI Components Library - 统一导出
 *
 * DocuMind Elite 基础 UI 组件库
 * 使用暖铜色系设计，支持可访问性
 */

// Button
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// Modal
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

// Dropdown
export { Dropdown } from './Dropdown';
export type { DropdownProps, DropdownItem } from './Dropdown';

// Tooltip
export { Tooltip } from './Tooltip';
export type { TooltipProps, TooltipPlacement } from './Tooltip';

// Spinner
export { Spinner, OverlaySpinner } from './Spinner';
export type { SpinnerProps, SpinnerSize, SpinnerVariant, OverlaySpinnerProps } from './Spinner';

// Card
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardVariant, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card';

// Tabs
export { Tabs, TabPane } from './Tabs';
export type { TabsProps, TabPaneProps, Tab } from './Tabs';

// Toast
export { default as Toast, ToastContainer, useToast, globalToast, setGlobalToastHandler } from './Toast';
export type { ToastType } from './Toast';
