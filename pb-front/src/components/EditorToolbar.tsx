'use client';

import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Table,
  Columns3,
  Rows3,
  Trash2,
  Palette,
  Undo2,
  Redo2,
} from 'lucide-react';

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 p-2.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed
        ${active ? 'bg-gray-200 text-indigo-600' : 'text-gray-600'}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="shrink-0 w-px h-6 bg-gray-200 mx-1.5" />;

export default function EditorToolbar({ editor }: { editor: Editor }) {
  const currentColor = (editor.getAttributes('textStyle').color as string) || '#111827';
  const inTable = editor.isActive('table');

  return (
    <div className="flex items-center gap-1 flex-nowrap overflow-x-auto px-2 py-2">
      <ToolbarButton
        label="제목 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="제목 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="제목 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="제목 4"
        active={editor.isActive('heading', { level: 4 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
      >
        <Heading4 className="w-5 h-5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="굵게"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="기울임"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="취소선"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-5 h-5" />
      </ToolbarButton>

      {/* 글자 색 */}
      <label
        title="글자 색"
        className="relative shrink-0 p-2.5 rounded-md hover:bg-gray-100 text-gray-600 cursor-pointer flex items-center"
      >
        <Palette className="w-5 h-5" style={{ color: currentColor }} />
        <input
          type="color"
          value={currentColor}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="글자 색 선택"
        />
      </label>
      <ToolbarButton
        label="글자 색 초기화"
        onClick={() => editor.chain().focus().unsetColor().run()}
      >
        <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">A</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="글머리 목록"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="번호 목록"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="인용"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="코드 블록"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="구분선"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="w-5 h-5" />
      </ToolbarButton>

      <Divider />

      {/* 표 */}
      <ToolbarButton
        label="표 삽입"
        active={inTable}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Table className="w-5 h-5" />
      </ToolbarButton>
      {inTable && (
        <>
          <ToolbarButton
            label="열 추가"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <Columns3 className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            label="행 추가"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <Rows3 className="w-5 h-5" />
          </ToolbarButton>
          <ToolbarButton
            label="표 삭제"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Trash2 className="w-5 h-5" />
          </ToolbarButton>
        </>
      )}

      <Divider />

      <ToolbarButton
        label="실행 취소"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="w-5 h-5" />
      </ToolbarButton>
      <ToolbarButton
        label="다시 실행"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="w-5 h-5" />
      </ToolbarButton>
    </div>
  );
}
