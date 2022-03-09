import { h, Fragment, VNode } from "preact";
import { Divider } from "../mui/Divider";
import { Button } from "./styled/index.js";
import { Typography } from "../mui/Typography";
import { Avatar } from "../mui/Avatar";
import { Grid } from "../mui/Grid";
import { Paper } from "../mui/Paper";

function SignalWifiOffIcon(): VNode {
  return <Fragment />;
}

function Banner({}: {}) {
  return (
    <Fragment>
      <Paper elevation={0} /*className={classes.paper}*/>
        <Grid container wrap="nowrap" spacing={16} alignItems="center">
          <Grid item>
            <Avatar /*className={classes.avatar}*/>
              <SignalWifiOffIcon />
            </Avatar>
          </Grid>
          <Grid item>
            <Typography>
              You have lost connection to the internet. This app is offline.
            </Typography>
          </Grid>
        </Grid>
        <Grid container justify="flex-end" spacing={8}>
          <Grid item>
            <Button color="primary">Turn on wifi</Button>
          </Grid>
        </Grid>
      </Paper>
      <Divider />
      {/* <CssBaseline /> */}
    </Fragment>
  );
}

export default Banner;
