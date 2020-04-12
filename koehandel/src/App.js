import React, { Component, Fragment } from "react";
import socketIOClient from "socket.io-client";
import { TopBar } from "./components";

class App extends Component {
  constructor() {
    super();
    this.state = {};
  }

  endpoint = "http://127.0.0.1:5000";

  componentDidMount() {
    const socket = socketIOClient(this.endpoint);
    var name = prompt("Please enter your name");
    socket.emit('new player', name);
    socket.on("state", state => this.setState(state));
  }

  renderTopBar() {
    const { ratCount, ezelCount, mode } = this.state;

    return (
      <TopBar
        ratCount={ratCount}
        ezelCount={ezelCount}
        mode={mode}
      />
    )
  };

  renderPlayers() {
  }

  renderSpelBord() {

  }

  renderDashboard() {

  }

  renderContent() {
    return (
    <Fragment>
    {
      this.renderTopBar()
      /* this.renderPlayers()
      this.renderSpelBord()
      this.renderDashboard() */
    }
    </Fragment>
    );

  }

  render() {
    return (
        <div style={styles.container}>
          {this.state
              ? this.renderContent()
              : <p>Loading...</p>}
        </div>
    );
  }
}

const styles = {
  container: {
    textAlign: "center",
  }
};

export default App;
