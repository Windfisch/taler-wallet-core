import { css } from "@linaria/core";
import { h, JSX, VNode, ComponentChildren, createContext } from "preact";
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

export interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
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
  ${theme.breakpoints.up("lg")} {
    width: calc(100% + var(--space-col-lg));
    margin-left: calc(-1 * var(--space-col-lg));
    & > div {
      padding-left: var(--space-col-lg);
    }
  }
  ${theme.breakpoints.up("xl")} {
    width: calc(100% + var(--space-col-xl));
    margin-left: calc(-1 * var(--space-col-xl));
    & > div {
      padding-left: var(--space-col-xl);
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
  ${theme.breakpoints.up("lg")} {
    margin-top: calc(-1 * var(--space-row-lg));
    & > div {
      padding-top: var(--space-row-lg);
    }
  }
  ${theme.breakpoints.up("xl")} {
    margin-top: calc(-1 * var(--space-row-xl));
    & > div {
      padding-top: var(--space-row-xl);
    }
  }
`;

const sizeVariantXS = css`
  ${theme.breakpoints.up("xs")} {
    flex-basis: var(--relation-col-vs-xs);
    flex-grow: 0;
    max-width: var(--relation-col-vs-xs);
  }
`;
const sizeVariantSM = css`
  ${theme.breakpoints.up("sm")} {
    flex-basis: var(--relation-col-vs-sm);
    flex-grow: 0;
    max-width: var(--relation-col-vs-sm);
  }
`;
const sizeVariantMD = css`
  ${theme.breakpoints.up("md")} {
    flex-basis: var(--relation-col-vs-md);
    flex-grow: 0;
    max-width: var(--relation-col-vs-md);
  }
`;
const sizeVariantLG = css`
  ${theme.breakpoints.up("lg")} {
    flex-basis: var(--relation-col-vs-lg);
    flex-grow: 0;
    max-width: var(--relation-col-vs-lg);
  }
`;
const sizeVariantXL = css`
  ${theme.breakpoints.up("xl")} {
    flex-basis: var(--relation-col-vs-xl);
    flex-grow: 0;
    max-width: var(--relation-col-vs-xl);
  }
`;

const sizeVariantExpand = css`
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
`;

const sizeVariantAuto = css`
  flex-basis: auto;
  flex-grow: 0;
  flex-shrink: 0;
  max-width: none;
  width: auto;
`;

const GridContext = createContext<Partial<ResponsiveSize>>(toResponsive(12));

function toResponsive(
  v: number | Partial<ResponsiveSize>,
): Partial<ResponsiveSize> {
  const p = typeof v === "number" ? { xs: v } : v;
  const xs = p.xs;
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
  onClick,
  ...rest
}: Props): VNode {
  const cc = useContext(GridContext);
  const columns = !cp ? cc : toResponsive(cp);

  const rowSpacing = rsp ? toResponsive(rsp) : toResponsive(spacing);
  const columnSpacing = csp ? toResponsive(csp) : toResponsive(spacing);

  const ssize = toResponsive({ xs, md, lg, xl, sm } as any);

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
        "--relation-col-vs-xs": relation(columns, ssize, "xs"),
        "--relation-col-vs-sm": relation(columns, ssize, "sm"),
        "--relation-col-vs-md": relation(columns, ssize, "md"),
        "--relation-col-vs-lg": relation(columns, ssize, "lg"),
        "--relation-col-vs-xl": relation(columns, ssize, "xl"),
      };

  return (
    <GridContext.Provider value={columns}>
      <div
        class={[
          root,
          container && containerStyle,
          item && itemStyle,
          zeroMinWidth && zeroMinWidthStyle,
          xs &&
            (xs === "auto"
              ? sizeVariantAuto
              : xs === "true"
              ? sizeVariantExpand
              : sizeVariantXS),
          sm &&
            (sm === "auto"
              ? sizeVariantAuto
              : sm === "true"
              ? sizeVariantExpand
              : sizeVariantSM),
          md &&
            (md === "auto"
              ? sizeVariantAuto
              : md === "true"
              ? sizeVariantExpand
              : sizeVariantMD),
          lg &&
            (lg === "auto"
              ? sizeVariantAuto
              : lg === "true"
              ? sizeVariantExpand
              : sizeVariantLG),
          xl &&
            (xl === "auto"
              ? sizeVariantAuto
              : xl === "true"
              ? sizeVariantExpand
              : sizeVariantXL),
          container && columnGapVariant,
          container && rowGapVariant,
        ].join(" ")}
        style={{
          ...relationStyles,
          ...spacingStyles,
          justifyContent,
          alignItems,
          flexWrap: wrap,
          cursor: onClick ? "pointer" : "inherit",
        }}
        onClick={onClick}
        {...rest}
      >
        {children}
      </div>
    </GridContext.Provider>
  );
}
function relation(
  cols: Partial<ResponsiveSize>,
  values: Partial<ResponsiveSize>,
  size: ResponsiveKeys,
) {
  const colsNum = typeof cols === "number" ? cols : cols[size] || 12;
  return (
    String(Math.round(((values[size] || 1) / colsNum) * 10e7) / 10e5) + "%"
  );
}
