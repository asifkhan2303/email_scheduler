import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR: { command: string; label: string; icon: string }[] = [
  { command: "bold", label: "Bold", icon: "M6 4h6a3.5 3.5 0 010 7H6zm0 7h7a3.5 3.5 0 010 7H6z" },
  { command: "italic", label: "Italic", icon: "M11 4h6M5 20h6M13 4L9 20" },
  { command: "underline", label: "Underline", icon: "M6 4v6a6 6 0 0012 0V4M4 20h16" },
  { command: "insertUnorderedList", label: "Bulleted list", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
  { command: "insertOrderedList", label: "Numbered list", icon: "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 14a1 1 0 011 1v.5H4v1h1.5" },
  { command: "formatBlock:BLOCKQUOTE", label: "Quote", icon: "M7 7h4v4H7a4 4 0 01-4-4V5h4zm10 0h4v4h-4a4 4 0 01-4-4V5h4z" }
];

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Only sync from prop when the editor is empty (initial mount / reset),
  // otherwise React re-rendering the same HTML would fight the cursor.
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML && value) ref.current.innerHTML = value;
  }, [value]);

  function run(command: string) {
    const [name, arg] = command.split(":");
    document.execCommand(name, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  }

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        {TOOLBAR.map((tool) => (
          <button
            key={tool.command}
            type="button"
            title={tool.label}
            onClick={() => run(tool.command)}
            className="rounded p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d={tool.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
        <button
          type="button"
          title="Clear formatting"
          onClick={() => run("removeFormat")}
          className="ml-auto rounded p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        data-empty={!value}
        className="rich-text editor-area min-h-[220px] px-4 py-3 text-sm text-ink outline-none"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}
