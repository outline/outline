// @flow
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import MenuIcon from "@material-ui/icons/Menu";
import clsx from "clsx";
import React from "react";
import SplitPane from "react-split-pane";
import Main from "components/Sidebar/Main";
import Section from "./Sidebar/components/Section";

const drawerWidth = 275;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },

  menuButtonOpen: {
    position: "absolute",
    margin: "auto",
    left: 10,
    backgroundColor: "#f1f1f1",
    zIndex: 999,
    padding: 15,
    "&:hover": {
      backgroundColor: "#f1f1f1",
    },
  },

  menuButtonClose: {
    left: 0,
  },

  hide: {
    display: "none",
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9) + 1,
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  paperAnchorLeft: {
    border: "none",
  },
}));

export default function MiniDrawer() {

  const resizerStyle = {
    background: "#000",
    cursor: "col-resize",
    height: "100%",
    border: "1px solid #DAE1E9",
  };

  const pane1Style = {
    backgroundColor: "#edf2f7",
  };

  const sizeInitialPane = 265;
  const defaultSize = 100;
  const miniSize = 70;

  const classes = useStyles();
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);

  const handleChange = (e) => {
    localStorage.setItem("app_outline", e);
    if (e === 70) {
      setOpen(false);
    }
    if (e >= 71 && e <= 150) {
      setOpen(false);
    } else if (e > 151) {
      setOpen(true);
    }
  };

  const handleDrawerOpenOver = () => {
    const valueResize = localStorage.getItem("app_outline");
    if (valueResize < 71) {
      setOpen(false);
    } else if (valueResize < 150) {
      setOpen(true);
    }
  };

  const handleDrawerOpen = () => {
    setOpen(true);
    localStorage.setItem("app_outline", 265);
  };

  const handleDrawerClose = () => {
    localStorage.setItem("app_outline", 70);
    setOpen(false);
  };

  return (
    <div className={classes.root}>
      <Drawer
        variant="permanent"
        className={clsx(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: clsx({
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
          paperAnchorLeft: classes.paperAnchorLeft,
        }}
        onMouseOver={handleDrawerOpenOver}
      >
        <SplitPane
          split="vertical"
          minSize={miniSize}
          maxSize={sizeInitialPane}
          defaultSize={defaultSize}
          defaultSize={parseInt(localStorage.getItem("app_outline"), 10)}
          onChange={handleChange}
          resizerStyle={resizerStyle}
          pane1Style={pane1Style}
        >
          <div>
            <div className={classes.toolbar}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerOpen}
                edge="start"
                className={clsx(classes.menuButtonOpen, open && classes.hide)}
              >
                <MenuIcon />
              </IconButton>

              <IconButton
                onClick={handleDrawerClose}
                className={clsx(classes.menuButtonClose)}
              >
                {theme.direction === "rtl" ? (
                  <ChevronRightIcon />
                ) : (
                    <ChevronLeftIcon />
                  )}
              </IconButton>
            </div>
            <Divider />

            <Section>
              <Main />
            </Section>
          </div>

          <div> </div>
        </SplitPane>
      </Drawer>
    </div>
  );
}
