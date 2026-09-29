import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  // Split into blocks (code blocks, headers, lists, paragraphs)
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language} code={block.content} />;
        }
        if (block.type === 'heading') {
          const Tag = `h${Math.min(block.level + 1, 4)}` as keyof JSX.IntrinsicElements;
          const headingStyles = {
            1: 'text-base font-bold text-[#183237] mt-3 mb-1 border-b border-[#e8efed] pb-1',
            2: 'text-sm font-bold text-[#183237] mt-2.5 mb-1',
            3: 'text-sm font-semibold text-[#1c4e48] mt-2 mb-0.5',
            4: 'text-xs uppercase font-bold text-[#5e7a76] tracking-wider mt-1.5',
          }[block.level] || 'font-bold text-[#183237]';

          return (
            <Tag key={idx} className={headingStyles}>
              {renderInline(block.content)}
            </Tag>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1 my-1.5 pl-4 list-disc marker:text-[#3c8b7e]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'numbered-list') {
          return (
            <ol key={idx} className="space-y-1 my-1.5 pl-4 list-decimal marker:text-[#3c8b7e] marker:font-semibold">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote key={idx} className="border-l-3 border-[#3c8b7e] pl-3 py-1 bg-[#f0f7f5] rounded-r-md text-[#235850] italic my-2">
              {renderInline(block.content)}
            </blockquote>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-[#d4e0dd] bg-[#0c2824] text-white">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#081d1a] border-b border-white/10 text-xs text-white/70">
        <span className="font-mono lowercase">{language || 'code'}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 transition text-xs text-white/80"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#7dd3c4]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-teal-50">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Inline formatting (bold, italic, code, links)
function renderInline(text: string): React.ReactNode {
  // Regex to match inline tokens: bold `**text**`, inline code `` `code` ``, italics `*text*`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|__.*?__)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-[#112724]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('__') && token.endsWith('__')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-[#112724]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-[#e8f4f1] text-[#1c4e48] font-mono text-[13px] border border-[#d2ebe5]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[#284f49]">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length ? parts : text;
}

type MarkdownBlock =
  | { type: 'p'; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'blockquote'; content: string };

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', language, content: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*]\s+(.+)$/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+(.+)$/)) {
        const itemMatch = lines[i].match(/^[-*]\s+(.+)$/);
        if (itemMatch) items.push(itemMatch[1].trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+(.+)$/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+(.+)$/)) {
        const itemMatch = lines[i].match(/^\d+\.\s+(.+)$/);
        if (itemMatch) items.push(itemMatch[1].trim());
        i++;
      }
      blocks.push({ type: 'numbered-list', items });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join(' ') });
      continue;
    }

    // Standard paragraph or empty line
    if (line.trim().length > 0) {
      const pLines = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim().length > 0 &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !lines[i].match(/^[-*]\s/) &&
        !lines[i].match(/^\d+\.\s/) &&
        !lines[i].startsWith('>')
      ) {
        pLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'p', content: pLines.join(' ') });
      continue;
    }

    i++;
  }

  return blocks;
}
