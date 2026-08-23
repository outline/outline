import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/shared/utils';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor(props: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <RichTextEditorSkeleton />;
  }

  return <RichTextEditorInner {...props} />;
}

function RichTextEditorSkeleton() {
  return (
    <div className="border border-input rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b border-input bg-muted/40">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}

function RichTextEditorInner({ value, onChange, className, placeholder, disabled }: RichTextEditorProps) {
  const { t } = useTranslation();
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
          'border-none',
        ),
      },
    },
  });


  if (!editor) {
    return <RichTextEditorSkeleton />;
  }

  return (
    <div className={cn("border border-input rounded-md overflow-hidden bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 p-1 border-b border-input bg-muted/40">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={<Heading1 size={16} />} title={t("common.heading1")} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={<Heading2 size={16} />} title={t("common.heading2")} />
        <div className="w-px h-6 bg-input mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={<Bold size={16} />} title={t("common.bold")} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={<Italic size={16} />} title={t("common.italic")} />
        <div className="w-px h-6 bg-input mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={<List size={16} />} title={t("common.bullet_list")} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={<ListOrdered size={16} />} title={t("common.ordered_list")} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ onClick, isActive, icon, title }: { onClick: () => void; isActive: boolean; icon: React.ReactNode; title: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", isActive && "bg-muted text-primary")}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      type="button"
      title={title}
    >
      {icon}
    </Button>
  );
}
