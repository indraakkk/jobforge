import MDEditor from "@uiw/react-md-editor";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div data-color-mode="light" className="markdown-render-sm">
      <MDEditor.Markdown
        source={content}
        style={{
          background: "transparent",
          color: "inherit",
        }}
      />
    </div>
  );
}
