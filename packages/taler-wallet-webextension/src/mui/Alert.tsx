import { css } from "@linaria/core";
import { ComponentChildren, h, VNode } from "preact";
// eslint-disable-next-line import/extensions
import CloseIcon from "../svg/close_24px.svg";
import ErrorOutlineIcon from "../svg/error_outline_outlined_24px.svg";
import InfoOutlinedIcon from "../svg/info_outlined_24px.svg";
import ReportProblemOutlinedIcon from "../svg/report_problem_outlined_24px.svg";
import SuccessOutlinedIcon from "../svg/success_outlined_24px.svg";
import { IconButton } from "./Button.js";
// eslint-disable-next-line import/extensions
import { darken, lighten } from "./colors/manipulation";
import { Paper } from "./Paper.js";
// eslint-disable-next-line import/extensions
import { theme } from "./style";
import { Typography } from "./Typography.js";

const defaultIconMapping = {
  success: SuccessOutlinedIcon,
  warning: ReportProblemOutlinedIcon,
  error: ErrorOutlineIcon,
  info: InfoOutlinedIcon,
};

const baseStyle = css`
  background-color: transparent;
  display: flex;
  padding: 6px 16px;
`;

const colorVariant = {
  standard: css`
    color: var(--color-light-06);
    background-color: var(--color-background-light-09);
  `,
  outlined: css`
    color: var(--color-light-06);
    border-width: 1px;
    border-style: solid;
    border-color: var(--color-light);
  `,
  filled: css`
    color: "#fff";
    font-weight: ${theme.typography.fontWeightMedium};
    background-color: var(--color-main);
  `,
};

interface Props {
  title?: string;
  variant?: "filled" | "outlined" | "standard";
  role?: string;
  onClose?: () => void;
  // icon: VNode;
  severity?: "info" | "warning" | "success" | "error";
  children: ComponentChildren;
  icon?: boolean;
}

const getColor = theme.palette.mode === "light" ? darken : lighten;
const getBackgroundColor = theme.palette.mode === "light" ? lighten : darken;

function Icon({ svg }: { svg: VNode }): VNode {
  return (
    <div
      class={css`
        margin-right: 12px;
        padding: 7px 0px;
        display: flex;
        font-size: 22px;
        opacity: 0.9;
        fill: currentColor;
      `}
      dangerouslySetInnerHTML={{ __html: svg as any }}
    ></div>
  );
}

function Action({ children }: { children: ComponentChildren }): VNode {
  return (
    <div
      class={css`
        display: flex;
        align-items: flex-start;
        padding: 4px 0px 0px 16px;
        margin-left: auto;
        margin-right: -8px;
      `}
    >
      {children}
    </div>
  );
}

function Message({
  title,
  children,
}: {
  title?: string;
  children: ComponentChildren;
}): VNode {
  return (
    <div
      class={css`
        padding: 8px 0px;
        width: 100%;
      `}
    >
      {title && (
        <Typography
          class={css`
            font-weight: ${theme.typography.fontWeightMedium};
          `}
          gutterBottom
        >
          {title}
        </Typography>
      )}
      {children}
    </div>
  );
}

export function Alert({
  variant = "standard",
  severity = "success",
  title,
  children,
  icon,
  onClose,
  ...rest
}: Props): VNode {
  return (
    <Paper
      class={[
        theme.typography.body2,
        baseStyle,
        severity && colorVariant[variant],
      ].join(" ")}
      style={{
        "--color-light-06": getColor(theme.palette[severity].light, 0.6),
        "--color-background-light-09": getBackgroundColor(
          theme.palette[severity].light,
          0.9,
        ),
        "--color-main": theme.palette[severity].main,
        "--color-light": theme.palette[severity].light,
        // ...(style as any),
      }}
      elevation={1}
    >
      {icon != false ? <Icon svg={defaultIconMapping[severity]} /> : null}
      <Message title={title}>{children}</Message>
      {onClose && (
        <Action>
          <IconButton svg={CloseIcon} onClick={onClose} />
        </Action>
      )}
    </Paper>
  );
}
