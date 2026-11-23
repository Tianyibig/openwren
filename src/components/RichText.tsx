import { IconBold, IconItalic, IconLink, IconList, IconListNumbers, IconUnderline } from "@tabler/icons-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";
import { useT } from "../lib/useTranslate";

interface Props {
  /** Starting content. Change `key` on the component to load different content. */
  initial: string;
  onChange: (html: string) => void;
  label: string;
  autoFocus?: boolean;
  className?: string;
  /** Extra controls at the right end of the toolbar. */
  toolbarEnd?: ReactNode;
}

function Tool({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // Keep the text selection: do not move focus to the button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded-md hover:bg-hover ${active ? "bg-sel text-brand" : "text-ink2"}`}
    >
      {children}
    </button>
  );
}

/** Rich-text editor for the composer and the signature editor. */
export function RichText({ initial, onChange, label, autoFocus, className = "", toolbarEnd }: Props) {
  const tr = useT();
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: initial,
    autofocus: autoFocus ? "start" : false,
    editorProps: { attributes: { "aria-label": label, class: "selectable outline-none min-h-full" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  if (!editor) return null;
  const chain = () => editor.chain().focus();

  function link() {
    if (editor!.isActive("link")) return chain().unsetLink().run();
    const url = window.prompt(tr("editor.linkAddress"), "https://");
    if (url && /^(https?:|mailto:)/i.test(url)) chain().setLink({ href: url }).run();
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="mb-2 flex flex-none flex-wrap items-center gap-1 rounded-[10px] bg-canvas px-2 py-1" role="toolbar" aria-label={tr("editor.formatting")}>
        <Tool label={tr("editor.bold")} active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <IconBold size={17} />
        </Tool>
        <Tool label={tr("editor.italic")} active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <IconItalic size={17} />
        </Tool>
        <Tool label={tr("editor.underline")} active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
          <IconUnderline size={17} />
        </Tool>
        <Tool label={tr("editor.bullets")} active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <IconList size={17} />
        </Tool>
        <Tool label={tr("editor.numbers")} active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <IconListNumbers size={17} />
        </Tool>
        <Tool label={tr("editor.link")} active={editor.isActive("link")} onClick={link}>
          <IconLink size={17} />
        </Tool>
        {toolbarEnd && <div className="ml-auto flex items-center gap-2">{toolbarEnd}</div>}
      </div>
      <EditorContent editor={editor} className="rich min-h-0 flex-1 overflow-y-auto leading-relaxed" />
    </div>
  );
}
