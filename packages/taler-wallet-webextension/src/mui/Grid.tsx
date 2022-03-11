import { css } from "@linaria/core";
import { h, Fragment, VNode, ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";
import { theme } from "./style";

type ResponsiveKeys = "xs" | "sm" | "md" | "lg" | "xl";

export type ResponsiveSize = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

const root = css`
  box-sizing: border-box;
`;
const containerStyle = css`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
`;
const itemStyle = css`
  margin: 0;
`;
const zeroMinWidthStyle = css`
  min-width: 0px;
`;

type GridSizes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type SpacingSizes = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Props {
  columns?: number | Partial<ResponsiveSize>;
  container?: boolean;
  item?: boolean;

  direction?: "column-reverse" | "column" | "row-reverse" | "row";

  lg?: GridSizes | "auto" | "true";
  md?: GridSizes | "auto" | "true";
  sm?: GridSizes | "auto" | "true";
  xl?: GridSizes | "auto" | "true";
  xs?: GridSizes | "auto" | "true";

  wrap?: "nowrap" | "wrap-reverse" | "wrap";
  spacing?: SpacingSizes | Partial<ResponsiveSize>;
  columnSpacing?: SpacingSizes | Partial<ResponsiveSize>;
  rowSpacing?: SpacingSizes | Partial<ResponsiveSize>;

  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-around"
    | "space-between"
    | "space-evenly";

  zeroMinWidth?: boolean;
  children: ComponentChildren;
}
theme.breakpoints.up;

function getOffset(val: number | string) {
  if (typeof val === "number") `${val}px`;
  return val;
}

const columnGapVariant = css`
  ${theme.breakpoints.up("xs")} {
    width: calc(100% + var(--space-col-xs));
    margin-left: calc(-1 * var(--space-col-xs));
    & > div {
      padding-left: var(--space-col-xs);
    }
  }
  ${theme.breakpoints.up("sm")} {
    width: calc(100% + var(--space-col-sm));
    margin-left: calc(-1 * var(--space-col-sm));
    & > div {
      padding-left: var(--space-col-sm);
    }
  }
  ${theme.breakpoints.up("md")} {
    width: calc(100% + var(--space-col-md));
    margin-left: calc(-1 * var(--space-col-md));
    & > div {
      padding-left: var(--space-col-md);
    }
  }
`;
const rowGapVariant = css`
  ${theme.breakpoints.up("xs")} {
    margin-top: calc(-1 * var(--space-row-xs));
    & > div {
      padding-top: var(--space-row-xs);
    }
  }
  ${theme.breakpoints.up("sm")} {
    margin-top: calc(-1 * var(--space-row-sm));
    & > div {
      padding-top: var(--space-row-sm);
    }
  }
  ${theme.breakpoints.up("md")} {
    margin-top: calc(-1 * var(--space-row-md));
    & > div {
      padding-top: var(--space-row-md);
    }
  }
`;

const sizeVariant = css`
  ${theme.breakpoints.up("xs")} {
    flex-basis: var(--relation-col-vs-xs);
    flex-grow: 0;
    max-width: var(--relation-col-vs-xs);
  }
  ${theme.breakpoints.up("sm")} {
    flex-basis: var(--relation-col-vs-sm);
    flex-grow: 0;
    max-width: var(--relation-col-vs-sm);
  }
  ${theme.breakpoints.up("md")} {
    flex-basis: var(--relation-col-vs-md);
    flex-grow: 0;
    max-width: var(--relation-col-vs-md);
  }
`;

const GridContext = createContext<ResponsiveSize>(toResponsive(12));

function toResponsive(v: number | Partial<ResponsiveSize>): ResponsiveSize {
  const p = typeof v === "number" ? { xs: v } : v;
  const xs = p.xs || 12;
  const sm = p.sm || xs;
  const md = p.md || sm;
  const lg = p.lg || md;
  const xl = p.xl || lg;
  return {
    xs,
    sm,
    md,
    lg,
    xl,
  };
}

export function Grid({
  columns: cp,
  container = false,
  item = false,
  direction = "row",
  lg,
  md,
  sm,
  xl,
  xs,
  wrap = "wrap",
  spacing = 0,
  columnSpacing: csp,
  rowSpacing: rsp,
  alignItems,
  justifyContent,
  zeroMinWidth = false,
  children,
}: Props): VNode {
  const cc = useContext(GridContext);
  const columns = !cp ? cc : toResponsive(cp);

  const rowSpacing = rsp ? toResponsive(rsp) : toResponsive(spacing);
  const columnSpacing = csp ? toResponsive(csp) : toResponsive(spacing);

  const ssize = toResponsive({ xs, md, lg, xl, sm } as any);

  if (container) {
    console.log(rowSpacing);
    console.log(columnSpacing);
  }
  const spacingStyles = !container
    ? {}
    : {
        "--space-col-xs": getOffset(theme.spacing(columnSpacing.xs)),
        "--space-col-sm": getOffset(theme.spacing(columnSpacing.sm)),
        "--space-col-md": getOffset(theme.spacing(columnSpacing.md)),
        "--space-col-lg": getOffset(theme.spacing(columnSpacing.lg)),
        "--space-col-xl": getOffset(theme.spacing(columnSpacing.xl)),

        "--space-row-xs": getOffset(theme.spacing(rowSpacing.xs)),
        "--space-row-sm": getOffset(theme.spacing(rowSpacing.sm)),
        "--space-row-md": getOffset(theme.spacing(rowSpacing.md)),
        "--space-row-lg": getOffset(theme.spacing(rowSpacing.lg)),
        "--space-row-xl": getOffset(theme.spacing(rowSpacing.xl)),
      };
  const relationStyles = !item
    ? {}
    : {
        "--relation-col-vs-sm": relation(columns, ssize, "sm"),
        "--relation-col-vs-lg": relation(columns, ssize, "lg"),
        "--relation-col-vs-xs": relation(columns, ssize, "xs"),
        "--relation-col-vs-xl": relation(columns, ssize, "xl"),
        "--relation-col-vs-md": relation(columns, ssize, "md"),
      };

  return (
    <GridContext.Provider value={columns}>
      <div
        id={container ? "container" : "item"}
        class={[
          root,
          container && containerStyle,
          item && itemStyle,
          zeroMinWidth && zeroMinWidthStyle,
          sizeVariant,
          container && columnGapVariant,
          container && rowGapVariant,
        ].join(" ")}
        style={{
          ...relationStyles,
          ...spacingStyles,
          justifyContent,
          alignItems,
        }}
      >
        {children}
      </div>
    </GridContext.Provider>
  );
}
function relation(
  cols: ResponsiveSize,
  values: ResponsiveSize,
  size: ResponsiveKeys,
) {
  const colsNum = typeof cols === "number" ? cols : cols[size] || 12;
  return (
    String(Math.round(((values[size] || 1) / colsNum) * 10e7) / 10e5) + "%"
  );
}
