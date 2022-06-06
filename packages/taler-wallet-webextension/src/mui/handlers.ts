import { TalerError } from "@gnu-taler/taler-wallet-core";

export interface TextFieldHandler {
  onInput: (value: string) => Promise<void>;
  value: string;
  error?: string;
}

export interface ButtonHandler {
  onClick?: () => Promise<void>;
  error?: TalerError;
}

export interface ToggleHandler {
  value?: boolean;
  button: ButtonHandler;
}

export interface SelectFieldHandler {
  onChange?: (value: string) => Promise<void>;
  error?: string;
  value: string;
  isDirty?: boolean;
  list: Record<string, string>;
}
