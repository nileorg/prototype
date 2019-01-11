const randomstring = require("randomstring")
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
let path = require('path')

class LocalInstance {
	constructor(ws, ipfs) {
		this.ws = ws
		this.ipfs = ipfs
		this.onlineNodes = []
		this.onlineClients = []
		this.init()
	}
	setSocket(socket) {
		socket.on("disconnect", data => this.processDisconnect(socket))
		socket.on("node.to.instance", data => this.processNodeRequest(socket, data))
		socket.on("client.to.instance", data => this.processClientRequest(socket, data))
	}
	init() {
		this.db = new sqlite3.Database('instance.db');
	}
	async processNodeRequest(socket, request) {
		if (request.action === "register") {
			this.registerNode(socket, request.parameters)
		}
		else if (request.action === "update") {
			this.updateNode(socket, request.parameters)
		}
		else if (request.action === "login") {
			this.loginNode(socket, request.parameters)
		}
		else if (request.action === "forward") {
			if (request.queue_id) {
				let node = await this.isNodeTokenValid(request.token)
				if (node) {
					await this.removeFromQueue(request.queue_id, node.node_id)
					if (this.onlineClients.filter(v => v.ws_id === request.recipient).length > 0) {
						this.ws.to(request.recipient).emit("node.to.client", {
							sender: socket.id,
							content: request.parameters
						});
					} else {
						this.addToQueue(request, {
							table: 'nodes',
							primaryKey: 'node_id'
						})
					}
				}
			} else {
				this.ws.to(request.recipient).emit("node.to.client", {
					sender: socket.id,
					content: request.parameters
				});
			}
		}
		else if (request.action === "queue") {
			let node = await this.isNodeTokenValid(request.token)
			if (node) {
				await this.removeFromQueue(request.queue_id, node.node_id)
				this.addToQueue(request, {
					table: 'nodes',
					primaryKey: 'node_id'
				})
			}
		}
	}
	async processClientRequest(socket, request) {
		if (request.action === "forward") {
			this.ws.to(request.recipient).emit("client.to.node", {
				sender: socket.id,
				content: request.parameters
			});
		}
		else if (request.action === "updateNodeList") {
			socket.emit("instance.to.client", {
				action: "updateOnlineNodes",
				parameters: {
					onlineNodes: this.onlineNodes
				}
			})
		}
		else if (request.action === "queue") {
			this.addToQueue(request, {
				table: 'clients',
				primaryKey: 'client_id'
			})
		}
		else if (request.action === "register") {
			this.registerClient(socket, request.parameters)
		}
		else if (request.action === "login") {
			this.loginClient(socket, request.parameters)
		}
		else if (request.action === "processQueue") {
			let client = await this.isClientTokenValid(request.token)
			if (client) {
				await this.removeFromQueue(request.parameters.queue_id, client.client_id)
				let queue_results = await this.getRecipientQueue(client.client_id)
				this.ws.to(socket.id).emit('instance.to.client', {
					action: "updateQueue",
					parameters: {
						queue: queue_results
					}
				})
			}
		}
	}
	addToQueue(request, entity) {
		this.db.all( 'SELECT * FROM ' + entity.table + ' WHERE token = ?', [request.token], (error, results) => {
			if (error) {
				throw error
			}
			if (results.length > 0) {
				const sender = results[0][entity.primaryKey]
				const recipient = request.recipient
				const content = request.parameters
				this.db.all( 'INSERT INTO queue VALUES (NULL, ?, ?, ?)', [sender, recipient, JSON.stringify(content)], (error, results) => {
					if (error) {
						throw error
					}
				})
			}
		});
	}
	removeFromQueue(queue_id, recipient) {
		return new Promise((resolve, reject) => {
			this.db.all( 'DELETE FROM queue WHERE queue_id = ? AND recipient = ?', [queue_id, recipient], (error, delete_result) => {
				if (error) {
					reject(error)
				}
				resolve()
			})
		})
	}
	getRecipientQueue(recipient) {
		return new Promise((resolve, reject) => {
			this.db.all( 'SELECT * FROM queue WHERE recipient = ?', [recipient], (error, queue_results) => {
				if (error) {
					reject(error)
				}
				queue_results.forEach(v => {
					v.content = JSON.parse(v.content)
				})
				resolve(queue_results)
			})
		})
	}
	processDisconnect(socket) {
		console.log(socket.id + " left the network")
		this.onlineNodes = this.onlineNodes.filter(node => node.ws_id !== socket.id)
		this.onlineClients = this.onlineClients.filter(client => client.ws_id !== socket.id)
		this.ws.sockets.emit("instance.to.client", {
			action: "updateOnlineNodes",
			parameters: {
				onlineNodes: this.onlineNodes
			}
		})
	}
	registerNode(socket, parameters) {
		let token = randomstring.generate(5)
		this.db.all( 'INSERT INTO nodes VALUES (NULL, ?, ?, ?)', [token, parameters.hash, JSON.stringify(parameters.information)], (error, results) => {
			if (error) {
				throw error
			}
			socket.emit("instance.to.node", {
				action: "registered",
				parameters: {
					token: token
				}
			})
			this.publishNodeList()
		});
	}
	async updateNode(socket, parameters) {
		if(parameters.hash && parameters.information) {
			let node = await this.isNodeTokenValid(parameters.token)
			if (node) {
				this.db.all( 'UPDATE nodes SET ipfs_hash = ?, information = ? WHERE node_id = ?', [parameters.hash, JSON.stringify(parameters.information), node.node_id], (error, results) => {
					if (error) {
						throw error
					}
					socket.emit("instance.to.node", {
						action: "updated",
						parameters: {}
					})
					this.publishNodeList()
				});
			}
		}
	}
	async loginNode(socket, parameters) {
		let node = await this.isNodeTokenValid(parameters.token)
		if (node) {
			let queue_results = await this.getRecipientQueue(node.node_id)
			let onlineClientsIds = this.onlineClients.map((v) => v['client_id']);
			queue_results.forEach(v => {
				let indexOfOnlineClient = onlineClientsIds.indexOf(v.sender)
				if (indexOfOnlineClient >= 0) {
					v.ws_id = this.onlineClients[indexOfOnlineClient].ws_id
				}
			})
			this.onlineNodes.push({
				ipfs_hash: node.ipfs_hash,
				node_id: node.node_id,
				ws_id: socket.id
			})
			this.ws.sockets.emit("instance.to.client", {
				action: "updateOnlineNodes",
				parameters: {
					onlineNodes: this.onlineNodes
				}
			})
			socket.emit("instance.to.node", {
				action: "logged",
				parameters: {
					hash: node.ipfs_hash,
					queue: queue_results
				}
			})
		} else {
			socket.emit("instance.to.node", {
				action: "loginFailed",
				parameters: {}
			})
		}
	}
	isNodeTokenValid(token) {
		return new Promise((resolve, reject) => {
			this.db.all( 'SELECT * FROM nodes WHERE token = ?', [token], (error, nodes_results) => {
				if (error) {
					reject(error)
				}
				if (nodes_results.length > 0) {
					resolve(nodes_results[0])
				} else {
					resolve(false)
				}
			})
		})
	}
	registerClient(socket, parameters) {
		let token = randomstring.generate(5)
		this.db.all( 'INSERT INTO clients VALUES (NULL, ?, ?)', [token, JSON.stringify(parameters.information)], (error, results) => {
			if (error) {
				throw error
			}
			socket.emit("instance.to.client", {
				action: "registered",
				parameters: {
					token: token
				}
			})
		});
	}
	async loginClient(socket, parameters) {
		let client = await this.isClientTokenValid(parameters.token)
		if (client) {
			let queue_results = await this.getRecipientQueue(client.client_id)
			let onlineNodesIds = this.onlineNodes.map((v) => v['node_id']);
			queue_results.forEach(v => {
				let indexOfOnlineNode = onlineNodesIds.indexOf(v.sender)
				if (indexOfOnlineNode >= 0) {
					v.ws_id = this.onlineNodes[indexOfOnlineNode].ws_id
				}
			})
			this.onlineClients.push({
				client_id: client.client_id,
				ws_id: socket.id
			})
			socket.emit("instance.to.client", {
				action: "logged",
				parameters: {
					information: JSON.parse(client.information),
					queue: queue_results
				}
			})
		} else {
			socket.emit("instance.to.client", {
				action: "loginFailed",
				parameters: {
					msg: "token not valid"
				}
			})
		}
	}
	isClientTokenValid(token) {
		return new Promise((resolve, reject) => {
			this.db.all( 'SELECT * FROM clients WHERE token = ?', [token], (error, clients_results) => {
				if (error) {
					reject(error)
				}
				if (clients_results.length > 0) {
					resolve(clients_results[0])
				} else {
					resolve(false)
				}
			})
		})
	}
	publishNodeList() {
		this.db.all( 'SELECT  node_id, ipfs_hash, COALESCE(information, "{}") information FROM nodes', (error, results) => {
			if (error) {
				throw error
			}
			let nodeList = []
			results.forEach((resultRow) => {
				nodeList.push({
					node_id: resultRow.node_id,
					ipfs_hash: resultRow.ipfs_hash,
					information: JSON.parse(resultRow.information),
				})
			})
			this.ipfs.files.add(Buffer.from(JSON.stringify(nodeList)), (err, files) => {
				console.log("New nodes list published, the ipfs hash is: " + files[0].hash)
				console.log("Updating IPNS...")
				this.ipfs.name.publish(files[0].hash, (err, res) => {
					let filePath = path.join(__dirname, 'ipfs_hash');
					fs.writeFile(filePath, res.value, function(err) {
						if(err) {
							return console.log(err);
						}
					});
					this.ws.emit("instance.to.client", {
						action: "updateIPNS",
						parameters: {
							ipns: res.name,
							ipfs: res.value
						}
					})
				})
			})
		});
	}
}

module.exports = LocalInstance