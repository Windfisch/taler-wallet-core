import { h, Fragment, VNode, JSX } from "preact";
import { Divider } from "../mui/Divider.js";
import { Button } from "../mui/Button.js";
import { Typography } from "../mui/Typography.js";
import { Avatar } from "../mui/Avatar.js";
import { Grid } from "../mui/Grid.js";
import { Paper } from "../mui/Paper.js";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  elements: {
    icon?: VNode;
    description: VNode;
    action?: () => void;
  }[];
  confirm?: {
    label: string;
    action: () => Promise<void>;
  };
}

export function Banner({ title, elements, confirm, ...rest }: Props): VNode {
  return (
    <Fragment>
      <Paper elevation={0} {...rest}>
        {title && (
          <Grid container>
            <Grid item>
              <Typography>{title}</Typography>
            </Grid>
          </Grid>
        )}
        <Grid container columns={1}>
          {elements.map((e, i) => (
            <Grid
              container
              item
              xs={1}
              key={i}
              wrap="nowrap"
              spacing={1}
              alignItems="center"
              onClick={e.action}
            >
              {e.icon && (
                <Grid item xs={"auto"}>
                  <Avatar>{e.icon}</Avatar>
                </Grid>
              )}
              <Grid item>{e.description}</Grid>
            </Grid>
          ))}
        </Grid>
        {confirm && (
          <Grid container justifyContent="flex-end" spacing={8}>
            <Grid item>
              <Button color="primary" onClick={confirm.action}>
                {confirm.label}
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
      <Divider />
    </Fragment>
  );
}

export default Banner;
