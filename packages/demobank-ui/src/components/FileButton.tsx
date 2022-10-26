import { h, VNode } from "preact";
import { useRef, useState } from "preact/hooks";

const MAX_IMAGE_UPLOAD_SIZE = 1024 * 1024;

export interface FileTypeContent {
  content: string;
  type: string;
  name: string;
}

interface Props {
  label: string;
  onChange: (v: FileTypeContent | undefined) => void;
}
export function FileButton(props: Props): VNode {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState(false);
  return (
    <div>
      <button class="button" onClick={(e) => fileInputRef.current?.click()}>
        <span>{props.label}</span>
      </button>
      <input
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
        onChange={(e) => {
          const f: FileList | null = e.currentTarget.files;
          if (!f || f.length != 1) return props.onChange(undefined);

          console.log(f);
          if (f[0].size > MAX_IMAGE_UPLOAD_SIZE) {
            setSizeError(true);
            return props.onChange(undefined);
          }
          setSizeError(false);
          return f[0].arrayBuffer().then((b) => {
            const content = new Uint8Array(b).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              "",
            );
            return props.onChange({
              content,
              name: f[0].name,
              type: f[0].type,
            });
          });
        }}
      />
      {sizeError && (
        <p class="help is-danger">File should be smaller than 1 MB</p>
      )}
    </div>
  );
}
