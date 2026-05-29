'use client';

import CodeBlock from '@tiptap/extension-code-block';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from '@tiptap/react';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function CodeBlockView({ node }: NodeViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한 거부 등은 무시 */
    }
  };

  return (
    <NodeViewWrapper className="relative group">
      <button
        type="button"
        contentEditable={false}
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 px-2 py-1 rounded
          bg-white/10 hover:bg-white/20 text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="코드 복사"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            복사
          </>
        )}
      </button>
      <pre>
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

// StarterKit 의 codeBlock 과 동일한 스키마(node name 'codeBlock')를 유지하면서
// 렌더링만 복사 버튼이 달린 React NodeView 로 교체.
export const CodeBlockWithCopy = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
