import React, { Component } from "react";
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor() {
    super();
    this.state = {};
  }

  endpoint = "http://127.0.0.1:5000"

  componentDidMount() {
    const socket = socketIOClient(this.endpoint);
    var name = prompt("Please enter your name");
    socket.emit('new player', name);
    socket.on("state", state => this.setState(state));
  }

  render() {
    return (
        <div style={{ textAlign: "center" }}>
          {this.state
              ? <p>
                {JSON.stringify(this.state)} en dan nog iets!
              </p>
              : <p>Loading...</p>}
        </div>
    );
  }
}

export default App;
