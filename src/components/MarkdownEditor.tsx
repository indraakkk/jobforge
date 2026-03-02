import MDEditor from "@uiw/react-md-editor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function MarkdownEditor({ value, onChange, placeholder, height = 300 }: Props) {
  return (
    <div data-color-mode="dark">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? "")}
        height={height}
        textareaProps={{ placeholder }}
        preview="edit"
      />
    </div>
  );
}
