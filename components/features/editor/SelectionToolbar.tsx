import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface SelectionToolbarProps {
  position: { top: number; left: number } | null;
  onAction: (action: string, extraData?: string) => void;
  onAddToContext: () => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ position, onAction, onAddToContext }) => {
  // 🆕 链接输入状态
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      requestAnimationFrame(() => {
        linkInputRef.current?.focus();
      });
    }
  }, [showLinkInput]);

  if (!position) return null;

  // 🔧 关键修复：onMouseDown 使用 preventDefault 防止编辑器失焦导致选区丢失
  const IconButton = ({ icon, label, onClick, color = "text-bronze-600" }: any) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      onMouseDown={(e: React.MouseEvent) => e.preventDefault()}  // 防止失焦
      className="!p-1.5 !min-h-0 hover:!bg-sand-100 !rounded-btn !transition-colors !flex !flex-col !items-center !min-w-[30px]"
      aria-label={label}
    >
      <i className={`fas fa-${icon} ${color} text-sm`} aria-hidden="true"></i>
    </Button>
  );

  const TextBtn = ({ text, label, onClick }: any) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      onMouseDown={(e: React.MouseEvent) => e.preventDefault()}  // 防止失焦
      className="!px-2 !py-1 !min-h-0 hover:!bg-sand-100 !rounded-btn !text-xs !font-bold !text-bronze-700"
      aria-label={label}
    >
      {text}
    </Button>
  );

  return (
    <div
      className="fixed z-[60] -translate-x-1/2 -translate-y-full mb-3 bg-cream-50 text-bronze-800 rounded-card shadow-xl border border-beige-200 flex flex-col animate-in fade-in zoom-in duration-200 py-1 px-2"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => {
        // 🔧 只对非输入元素阻止默认行为，让输入框能正常获取焦点
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <div className="flex items-center gap-1">
        {/* 引用按钮 - 添加到AI上下文 */}
        <div className="flex items-center pr-2 border-r border-beige-200 mr-1">
           <IconButton icon="comment-dots" color="text-bronze-600" label="添加到AI上下文" onClick={onAddToContext} />
        </div>

        {/* Formatting Group */}
        <div className="flex items-center gap-0.5">
           <TextBtn text="H1" onClick={() => onAction('formatBlock', 'H1')} />
           <TextBtn text="H2" onClick={() => onAction('formatBlock', 'H2')} />
           <IconButton icon="bold" label="Bold" onClick={() => onAction('bold')} />
           <IconButton icon="italic" label="Italic" onClick={() => onAction('italic')} />
           <IconButton icon="underline" label="Underline" onClick={() => onAction('underline')} />
           <IconButton icon="highlighter" color="text-yellow-600" label="Highlight" onClick={() => onAction('hiliteColor', '#fef08a')} />
           <IconButton icon="link" label="Link" onClick={() => {
              setShowLinkInput(!showLinkInput);
           }} />

           <div className="w-px h-4 bg-beige-200 mx-1"></div>

           <IconButton icon="copy" label="Copy" onClick={() => onAction('copy')} />
        </div>
      </div>

      {/* 🆕 链接URL输入框 */}
      {showLinkInput && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (linkUrl.trim()) {
              onAction('createLink', linkUrl);
              setLinkUrl('');
              setShowLinkInput(false);
            }
          }}
          className="mt-2 pt-2 border-t border-beige-100 flex items-center space-x-2"
        >
          <i className="fas fa-link text-bronze-400 text-xs"></i>
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="输入链接地址..."
            className="flex-1 bg-sand-100 border border-beige-200 rounded-btn px-2 py-1 text-xs text-bronze-700 focus:border-bronze-500 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="!bg-bronze-600 hover:!bg-bronze-700 !text-cream-50 !rounded-btn !px-2 !py-1 !text-xs !font-bold !shadow-btn !min-h-0"
            aria-label="确认链接"
          >
            <i className="fas fa-check" aria-hidden="true"></i>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
            className="!bg-sand-200 hover:!bg-sand-300 !text-bronze-600 !rounded-btn !px-2 !py-1 !text-xs !min-h-0"
            aria-label="取消链接"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </Button>
        </form>
      )}

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cream-50 filter drop-shadow-sm"></div>
    </div>
  );
};

export default SelectionToolbar;