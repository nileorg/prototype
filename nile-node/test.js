const Node = require("./src/node")
const io = require('socket.io-client');
const socket = io('http://localhost:3334');
const IPFS = require('ipfs')
const ipfs = new IPFS({
	repo: 'node1' ,
	config: {
		Addresses: {
			Swarm: ['/ip4/0.0.0.0/tcp/0'],
		},
	}
})

/**
 * Registering a new node
 */
function registerNode(node) {
	// You fill informations, components and actions
	node.information = {
		name: "Store 1",
		location: "asd"
	}
	node.components = [
		{
			"type": "button",
			"action": "function1",
			"parameters": ["inp1"],
			"label": "Call function1"
		},
		{
			"type": "text",
			"key": "inp1"
		},
		{
			"type": "output",
			"key": "out1"
		}
	]
	node.actions = {
		function1: "return (" + String(()=>{
			let uppercase = ""
			if(parameters.inp1){
				uppercase = parameters.inp1.toUpperCase()
			}
			reply({
				_key: "out1",
				_data: "Your uppercase string is: '" + uppercase + "'"
			})
		}) + ")()",
		function2: "console.log('function2')",
	}
	// You call the register method and listen for the registered event, remember to save the token properties!

	node.register();
	node.on("registered", (data) => {
		console.log("Registered with token: " + data.token)
		console.log("Loggin in...")
		node.token // You password to login as your node
		node.login();
		node.on("logged", info => {
			console.log("Logged!")
		})
	})
}

/**
 * Login and existing node
 */
function loginNode(node) {
	// Using the token call the login method, and listen for the logged event
	node.token = "WpeqG";
	console.log("Loggin in...")
	node.login();
	node.on("logged", info => {
		console.log("Logged!")
		node.information.name = "Name Updated!"
		node.actions = {
			function1: "return (" + String(()=>{
				let uppercase = ""
				if(parameters.inp1){
					uppercase = parameters.inp1.toUpperCase()
				}
				reply({
					_key: "out1",
					_data: "Your uppercase string is: '" + uppercase + "'"
				})
			}) + ")()",
			function2: "console.log('function2')",
		}
		console.log("Updating...")
		node.update()
		node.on("updated", ()=>console.log("Node updated!"))
	})
	node.on("loginFailed", () => console.log("Login failed!"))
}

socket.on('connect', () => {
	ipfs.on('ready', () => {
		console.log("NODE")
		// You set up a new node
		const node = new Node(socket, ipfs)
		//registerNode(node)
		loginNode(node)
	})
})

