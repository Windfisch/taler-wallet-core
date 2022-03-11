import { h, Fragment, VNode, JSX } from "preact";
import { Divider } from "../mui/Divider";
import { Button } from "../mui/Button";
import { Typography } from "../mui/Typography";
import { Avatar } from "../mui/Avatar";
import { Grid } from "../mui/Grid";
import { Paper } from "../mui/Paper";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  elements: {
    icon?: VNode;
    description: VNode;
  }[];
  confirm?: {
    label: string;
    action: () => void;
  };
}

export function Banner({ title, elements, confirm, ...rest }: Props) {
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
