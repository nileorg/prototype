const EventEmitter = require('events')

class Node extends EventEmitter {
	constructor(ws, ipfs) {
		super()
		this.ws = ws
		this.ipfs = ipfs
		this.loadListeners()
	}
	loadListeners() {
		this.ws.on("instance.to.node", data => this.processInstanceRequest(data))
		this.ws.on("client.to.node", data => this.processClientRequest(data))
	}
	processClientRequest(request) {
		let f_string = this.actions[request.content.action]
		let f = new Function("parameters", "reply", f_string)
		const sender = request.sender
		const request_id = "request_" + Date.now()
		this.emit("requestReceived", {
			request_id: request_id,
			content: request
		})
		f(request.content.parameters, (response) => {
			this.ws.emit("node.to.instance", {
				action: "forward",
				recipient: sender,
				parameters: response
			})
			this.emit("requestReplied", {
				request_id: request_id,
				content: request
			})
		});
	}
	processInstanceRequest(request) {
		switch (request.action) {
			case 'registered': {
				this.registered(request.parameters)
			} break;
			case 'updated': {
				this.updated(request.parameters)
			} break;
			case 'logged': {
				this.logged(request.parameters)
			} break;
			case 'loginFailed': {
				this.loginFailed()
			}
		}
	}
	async login() {
		this.ws.emit("node.to.instance", {
			action: "login",
			parameters: {
				token: this.token
			}
		})
	}
	async logged(parameters) {
		this.queue = parameters.queue
		this.hash = parameters.hash
		let properties_file = ''
		this.ipfs.files.get(this.hash, (err, files) => {
			files.forEach(file => { properties_file += file.content.toString() })
			let properties = JSON.parse(properties_file)
			this.information = properties.information
			this.components = properties.components
			this.actions = properties.actions
			this.queue.forEach(v => {
				let content = v.content
				let recipient, action
				if(v.ws_id) {
					recipient = v.ws_id
					action = "forward"
				} else {
					recipient = v.sender
					action = "queue"
				}
				let f_string = this.actions[content.action]
				let f = new Function("parameters", "reply", f_string)
				const request_id = "request_" + Date.now()
				console.log(content)
				this.emit("requestReceived", {
					request_id: request_id,
					content: {
						content: content
					}
				})
				f(content.parameters, (response) => {
					this.ws.emit("node.to.instance", {
						action: action,
						recipient: recipient,
						parameters: response,
						queue_id: v.queue_id,
						token: this.token
					})
					this.emit("requestReplied", {
						request_id: request_id,
						content: {
							content: content
						}
					})
				})
			})
			this.emit("logged", {
				information: this.information,
				components: this.components,
				actions: this.actions
			})
		})
	}
	async loginFailed() {
		this.emit("loginFailed")
	}
	async register() {
		this.ipfs.files.add(Buffer.from(JSON.stringify({
			information: this.information,
			components: this.components,
			actions: this.actions,
		})), (err, files) => {
			this.hash = files[0].hash
			this.ws.emit("node.to.instance", {
				action: "register",
				parameters: {
					hash: this.hash,
					information: this.information
				}
			})
		})
	}
	async registered(parameters) {
		this.token = parameters.token
		this.emit("registered", {
			token: this.token
		})
	}
	async update() {
		this.ipfs.files.add(Buffer.from(JSON.stringify({
			information: this.information,
			components: this.components,
			actions: this.actions,
		})), (err, files) => {
			this.hash = files[0].hash
			this.ws.emit("node.to.instance", {
				action: "update",
				parameters: {
					token: this.token,
					hash: this.hash,
					information: this.information
				}
			})
		})
	}
	async updated(parameters) {
		this.emit("updated")
	}
}

module.exports = Node