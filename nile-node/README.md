**This is just a prototype, the node should run in the browser, in this example it will run in the terminal**
# Nile Node
The node is the basic component of Nile, it is composed by:
* Basic information (name, location...)
* Actions: all the services that the node hosts. These actions are called directly be the clients through a WebSocket connection
* Components: the views that the clients load and use to call the actions. 

## Configuration
Install the nodejs dependencies
```
npm install
```

## Running
```
npm start
```

## How it works
### Registration
A Node registers to the Nile Local Instance. In order to register it needs to pass the IPFS hash that points to its properties. Following the steps:
* The node publishes its properties on IPFS and receives an IPFS Hash
* The node send the IPFS Hash to the Local Instance
* If the local instance accepts the node it replies with a token
* The token is needed by the node to identify itself
### Login
The node sends a login request to the instance passing its token, if the token is correct the instance mark it as online
### Incoming requests from Client
Incoming requests are executed by functions inside the ```node.actions``` object. The function has 2 arguments: 
* ```parameters```, the parameters of the request
* ```reply```, a callback used to reply to the client