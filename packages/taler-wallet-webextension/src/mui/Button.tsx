import { ComponentChildren, h, VNode, JSX } from "preact";
import { css } from "@linaria/core";
// eslint-disable-next-line import/extensions
import { theme, ripple, Colors, rippleOutlined } from "./style";
// eslint-disable-next-line import/extensions
import { alpha } from "./colors/manipulation";

const buttonBaseStyle = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  background-color: transparent;
  outline: 0;
  border: 0;
  margin: 0;
  border-radius: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  text-decoration: none;
  color: inherit;
`;

interface Props {
  children?: ComponentChildren;
  disabled?: boolean;
  disableElevation?: boolean;
  disableFocusRipple?: boolean;
  endIcon?: string | VNode;
  fullWidth?: boolean;
  style?: h.JSX.CSSProperties;
  href?: string;
  size?: "small" | "medium" | "large";
  startIcon?: VNode | string;
  variant?: "contained" | "outlined" | "text";
  color?: Colors;
  onClick?: () => Promise<void>;
}

const button = css`
  min-width: 64px;
  &:hover {
    text-decoration: none;
    background-color: var(--text-primary-alpha-opacity);
    @media (hover: none) {
      background-color: transparent;
    }
  }
  &:disabled {
    color: ${theme.palette.action.disabled};
  }
`;
const colorIconVariant = {
  outlined: css`
    fill: var(--color-main);
  `,
  contained: css`
    fill: var(--color-contrastText);
  `,
  text: css`
    fill: var(--color-main);
  `,
};

const colorVariant = {
  outlined: css`
    color: var(--color-main);
    border: 1px solid var(--color-main-alpha-half);
    background-color: var(--color-contrastText);
    &:hover {
      border: 1px solid var(--color-main);
      background-color: var(--color-main-alpha-opacity);
    }
    &:disabled {
      border: 1px solid ${theme.palette.action.disabledBackground};
    }
  `,
  contained: css`
    color: var(--color-contrastText);
    background-color: var(--color-main);
    box-shadow: ${theme.shadows[2]};
    &:hover {
      background-color: var(--color-grey-or-dark);
    }
    &:active {
      box-shadow: ${theme.shadows[8]};
    }
    &:focus-visible {
      box-shadow: ${theme.shadows[6]};
    }
    &:disabled {
      color: ${theme.palette.action.disabled};
      box-shadow: ${theme.shadows[0]};
      background-color: ${theme.palette.action.disabledBackground};
    }
  `,
  text: css`
    color: var(--color-main);
    &:hover {
      background-color: var(--color-main-alpha-opacity);
    }
  `,
};

const sizeIconVariant = {
  outlined: {
    small: css`
      padding: 3px;
      font-size: ${theme.pxToRem(7)};
    `,
    medium: css`
      padding: 5px;
    `,
    large: css`
      padding: 7px;
      font-size: ${theme.pxToRem(10)};
    `,
  },
  contained: {
    small: css`
      padding: 4px;
      font-size: ${theme.pxToRem(13)};
    `,
    medium: css`
      padding: 6px;
    `,
    large: css`
      padding: 8px;
      font-size: ${theme.pxToRem(10)};
    `,
  },
  text: {
    small: css`
      padding: 4px;
      font-size: ${theme.pxToRem(13)};
    `,
    medium: css`
      padding: 6px;
    `,
    large: css`
      padding: 8px;
      font-size: ${theme.pxToRem(15)};
    `,
  },
};
const sizeVariant = {
  outlined: {
    small: css`
      padding: 3px 9px;
      font-size: ${theme.pxToRem(13)};
    `,
    medium: css`
      padding: 5px 15px;
    `,
    large: css`
      padding: 7px 21px;
      font-size: ${theme.pxToRem(15)};
    `,
  },
  contained: {
    small: css`
      padding: 4px 10px;
      font-size: ${theme.pxToRem(13)};
    `,
    medium: css`
      padding: 6px 16px;
    `,
    large: css`
      padding: 8px 22px;
      font-size: ${theme.pxToRem(15)};
    `,
  },
  text: {
    small: css`
      padding: 4px 5px;
      font-size: ${theme.pxToRem(13)};
    `,
    medium: css`
      padding: 6px 8px;
    `,
    large: css`
      padding: 8px 11px;
      font-size: ${theme.pxToRem(15)};
    `,
  },
};

const fullWidthStyle = css`
  width: 100%;
`;

export function Button({
  children,
  disabled,
  startIcon: sip,
  endIcon: eip,
  fullWidth,
  variant = "text",
  size = "medium",
  style: parentStyle,
  color = "primary",
  onClick,
}: Props): VNode {
  const style = css`
    user-select: none;
    width: 24px;
    height: 24px;
    display: inline-block;
    fill: currentColor;
    flex-shrink: 0;
    transition: fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;

    & > svg {
      font-size: 20;
    }
  `;

  const startIcon = sip && (
    <span
      class={[
        css`
          margin-right: 8px;
          margin-left: -4px;
          mask: var(--image) no-repeat center;
        `,
        colorIconVariant[variant],
        sizeIconVariant[variant][size],
        style,
      ].join(" ")}
      //FIXME: check when sip can be a vnode
      dangerouslySetInnerHTML={{ __html: sip as string }}
      style={{
        "--color-main": theme.palette[color].main,
        "--color-contrastText": theme.palette[color].contrastText,
      }}
    />
  );
  const endIcon = eip && (
    <span
      class={[
        css`
          margin-right: -4px;
          margin-left: 8px;
          mask: var(--image) no-repeat center;
        `,
        colorIconVariant[variant],
        sizeIconVariant[variant][size],
        style,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: eip as string }}
      style={{
        "--color-main": theme.palette[color].main,
        "--color-contrastText": theme.palette[color].contrastText,
        "--color-dark": theme.palette[color].dark,
      }}
    />
  );
  return (
    <ButtonBase
      disabled={disabled}
      class={[
        theme.typography.button,
        theme.shape.roundBorder,
        button,
        fullWidth && fullWidthStyle,
        colorVariant[variant],
        sizeVariant[variant][size],
      ].join(" ")}
      containedRipple={variant === "contained"}
      onClick={onClick}
      style={{
        ...parentStyle,
        "--color-main": theme.palette[color].main,
        "--color-contrastText": theme.palette[color].contrastText,
        "--color-main-alpha-half": alpha(theme.palette[color].main, 0.5),
        "--color-dark": theme.palette[color].dark,
        "--color-light": theme.palette[color].light,
        "--color-main-alpha-opacity": alpha(
          theme.palette[color].main,
          theme.palette.action.hoverOpacity,
        ),
        "--text-primary-alpha-opacity": alpha(
          theme.palette.text.primary,
          theme.palette.action.hoverOpacity,
        ),
        "--color-grey-or-dark": !color
          ? theme.palette.grey.A100
          : theme.palette[color].dark,
      }}
    >
      {startIcon}
      {children}
      {endIcon}
    </ButtonBase>
  );
}

interface BaseProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  class: string;
  onClick?: () => Promise<void>;
  containedRipple?: boolean;
  children?: ComponentChildren;
}

function ButtonBase({
  class: _class,
  children,
  containedRipple,
  onClick,
  dangerouslySetInnerHTML,
  ...rest
}: BaseProps): VNode {
  function doClick(): void {
    if (onClick) onClick();
  }
  const classNames = [
    buttonBaseStyle,
    _class,
    containedRipple ? ripple : rippleOutlined,
  ].join(" ");
  if (dangerouslySetInnerHTML) {
    return (
      <button
        onClick={doClick}
        class={classNames}
        dangerouslySetInnerHTML={dangerouslySetInnerHTML}
        {...rest}
      />
    );
  }
  return (
    <button onClick={doClick} class={classNames} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  svg,
  onClick,
}: {
  svg: any;
  onClick?: () => Promise<void>;
}): VNode {
  return (
    <ButtonBase
      onClick={onClick}
      class={[
        css`
          text-align: center;
          flex: 0 0 auto;
          font-size: ${theme.typography.pxToRem(24)};
          padding: 8px;
          border-radius: 50%;
          overflow: visible;
          color: "inherit";
          fill: currentColor;
        `,
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
