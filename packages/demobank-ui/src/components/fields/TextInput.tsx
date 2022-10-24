import { h, VNode } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export interface TextInputProps {
  inputType?: 'text' | 'number' | 'multiline' | 'password';
  label: string;
  grabFocus?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  tooltip?: string;
  onConfirm?: () => void;
  bind: [string, (x: string) => void];
}

const TextInputType = function ({ inputType, grabFocus, ...rest }: any): VNode {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (grabFocus) 
      inputRef.current?.focus();
    
  }, [grabFocus]);

  return inputType === 'multiline' ? (
    <textarea {...rest} rows={5} ref={inputRef} style={{ height: 'unset' }} />
  ) : (
    <input {...rest} type={inputType} ref={inputRef} />
  );
};

export function TextInput(props: TextInputProps): VNode {
  const value = props.bind[0];
  const [dirty, setDirty] = useState(false);
  const showError = dirty && props.error;
  return (
    <div class="field">
      <label class="label">
        {props.label}
        {props.tooltip && (
          <span class="icon has-tooltip-right" data-tooltip={props.tooltip}>
            <i class="mdi mdi-information" />
          </span>
        )}
      </label>
      <div class="control has-icons-right">
        <TextInputType
          inputType={props.inputType}
          value={value}
          grabFocus={props.grabFocus}
          disabled={props.disabled}
          placeholder={props.placeholder}
          class={showError ? 'input is-danger' : 'input'}
          onKeyPress={(e: any) => {
            if (e.key === 'Enter' && props.onConfirm) 
              props.onConfirm();
            
          }}
          onInput={(e: any) => {
            setDirty(true);
            props.bind[1]((e.target as HTMLInputElement).value);
          }}
          style={{ display: 'block' }}
        />
      </div>
      {showError && <p class="help is-danger">{props.error}</p>}
    </div>
  );
}
