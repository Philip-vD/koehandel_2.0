import React, { Component } from "react";

class TopBar extends Component {

  render() {
    const { ratCount, ezelCount, mode } = this.props;

    return (
      <p>
        {[ratCount, mode, ezelCount].join(' ')}
      </p>
    );
  }
}

export default TopBar;