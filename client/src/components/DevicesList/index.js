import React, { Component } from 'react';
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import VideocamIcon from "@material-ui/icons/Videocam";
import ListItemText from "@material-ui/core/ListItemText";
import List from "@material-ui/core/List";
import {GET} from "../../constants/devices";
import {withStyles} from "@material-ui/core";
import connect from "react-redux/es/connect/connect";

class DevicesList extends List {
  componentDidMount() {
    this.props.onRequestDevices();
  };

  render() {
    return (
      <div>
          <ListSubheader inset>Cameras</ListSubheader>
          {this.props.list.map(device => (
            <ListItem button key={device}>
              <ListItemIcon>
                <VideocamIcon />
              </ListItemIcon>
              <ListItemText primary={device} />
            </ListItem>
          ))}
      </div>
    );
  }
}

const mapStateToProps = state => {
  return state.devices;
};

const mapDispatchToProps = dispatch => {
  return {
    onRequestDevices: () => dispatch({ type: GET })
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DevicesList);

