'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders agent output as GitHub-flavoured markdown.
 *
 * react-markdown dropped its own `className` prop, so the prose styles live on a wrapper. Tables
 * get their own horizontal scroll container — agent output frequently contains wide metric tables
 * and the page body must never scroll sideways.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-ink',
        'prose-p:text-ink prose-li:text-ink prose-strong:text-ink',
        'prose-a:text-ink prose-a:underline prose-a:underline-offset-2',
        'prose-code:rounded prose-code:bg-field prose-code:px-1 prose-code:py-0.5',
        'prose-code:text-ink prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-field prose-pre:text-ink',
        'prose-th:text-ink prose-td:text-ink prose-hr:border-line',
        'prose-blockquote:border-l-line prose-blockquote:text-ink-muted',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
