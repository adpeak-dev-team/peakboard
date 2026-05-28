'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { TableKit } from '@tiptap/extension-table';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect } from 'react';
import EditorToolbar from './EditorToolbar';
import { CodeBlockWithCopy } from './CodeBlockWithCopy';

interface DocumentEditorProps {
  provider: HocuspocusProvider;
  user: { name: string; color: string };
  editable?: boolean;
}

export default function DocumentEditor({
  provider,
  user,
  editable = true,
}: DocumentEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      // 히스토리(undoRedo)는 Collaboration 이 Yjs 기반으로 제공하므로 StarterKit 쪽은 끔.
      // codeBlock 은 복사 버튼이 달린 커스텀 노드뷰로 대체 (스키마 동일).
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      CodeBlockWithCopy,
      Placeholder.configure({ placeholder: '내용을 입력하세요…' }),
      TextStyle,
      Color,
      TableKit.configure({ table: { resizable: true } }),
      Collaboration.configure({ document: provider.document }),
      CollaborationCaret.configure({ provider, user }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[60vh] px-1 py-3',
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <>
      <EditorContent editor={editor} />
      {editable && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto px-2 lg:px-8">
            <EditorToolbar editor={editor} />
          </div>
        </div>
      )}
    </>
  );
}
