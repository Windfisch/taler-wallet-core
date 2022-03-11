import { h, Fragment, VNode } from "preact";
import { Divider } from "../mui/Divider";
import { Button } from "../mui/Button";
import { Typography } from "../mui/Typography";
import { Avatar } from "../mui/Avatar";
import { Grid } from "../mui/Grid";
import { Paper } from "../mui/Paper";
import { Icon } from "./styled";
import settingsIcon from "../../static/img/settings_black_24dp.svg";
// & > a > div.settings-icon {
//   mask: url(${settingsIcon}) no-repeat center;
//   background-color: white;
//   width: 24px;
//   height: 24px;
//   margin-left: auto;
//   margin-right: 8px;
//   padding: 4px;
// }
// & > a.active {
//   background-color: #f8faf7;
//   color: #0042b2;
//   font-weight: bold;
// }
// & > a.active > div.settings-icon {
//   background-color: #0042b2;
// }

function SignalWifiOffIcon({ ...rest }: any): VNode {
  return <Icon {...rest} />;
}

export function Banner({}: {}) {
  return (
    <Fragment>
      <Paper elevation={3} /*className={classes.paper}*/>
        <Grid
          container
          // wrap="nowrap"
          // spacing={10}
          alignItems="center"
          columns={3}
        >
          <Grid item xs={1}>
            <Avatar>
              <SignalWifiOffIcon style={{ backgroundColor: "red" }} />
            </Avatar>
          </Grid>
          <Grid item xs={1}>
            <Typography>
              You have lost connection to the internet. This app is offline.
            </Typography>
          </Grid>
        </Grid>
        <Grid container justifyContent="flex-end" spacing={8} columns={3}>
          <Grid item xs={1}>
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
