const EventEmitter = require('events')

module.exports = class Client extends EventEmitter {
  constructor (ws, ipfs, ipfs_hash) {
    super()
    this.ws = ws
    this.ipfs = ipfs
    this.ipfs_hash = ipfs_hash
    this.loadListeners()
    this.init()
  }
  init () {
    let nodeListString = ''
    this.ipfs.files.get(this.ipfs_hash, (err, files) => {
      files.forEach(file => { nodeListString += file.content.toString() })
      this.nodeList = JSON.parse(nodeListString)
      this.ws.emit('client.to.instance', { action: 'updateNodeList' })
      this.emit('initialized')
    })
  }
  loadListeners () {
    this.ws.on('instance.to.client', data => this.processInstanceRequest(data))
    this.ws.on('node.to.client', data => this.processNodeRequest(data))
  }
  processInstanceRequest (request) {
    if (request.action === 'updateOnlineNodes') {
      let onlineNodes = request.parameters.onlineNodes
      let onlineNodesIds = onlineNodes.map(function (row) {
        return row['node_id']
      })
      this.nodeListOnline = this.nodeList.map((v) => {
        let onlineNodesIndex = onlineNodesIds.indexOf(v.node_id)
        if (onlineNodesIndex >= 0) {
          v.online = true
          v.ws_id = onlineNodes[onlineNodesIndex].ws_id
        } else {
          v.online = false
        }
        return v
      })
      this.emit('nodeListUpdated', {
        nodeList: this.nodeListOnline
      })
    } else if (request.action === 'registered') {
      this.token = request.parameters.token
      this.emit('registered', {
        token: this.token
      })
    } else if (request.action === 'logged') {
      this.information = request.parameters.information
      this.queue = request.parameters.queue
      this.emit('logged', {
        information: this.information,
        queue: this.queue
      })
    } else if (request.action === 'updateQueue') {
      this.queue = request.parameters.queue
      this.emit('queueUpdated', {
        queue: this.queue
      })
    } else if (request.action === 'loginFailed') {
      this.emit('loginFailed', {
        msg: request.parameters.msg
      })
    } else if (request.action === 'updateIPNS') {
      let ipns = request.parameters.ipns // ipns is still a work in progress
      this.emit('ipnsUpdated', {
        ipfs: request.parameters.ipfs
      })
    }
  }
  processNodeRequest (request) {
    this.nodeListOnline = this.nodeListOnline.map((v) => {
      if (request.sender === v.ws_id) {
        if (request.content._key) {
          if (v.data) {
            v.data[request.content._key] = request.content._data
          }
        }
      }
      return v
    })
    this.emit('nodeListUpdated', {
      nodeList: this.nodeListOnline
    })
    this.emit('response', request)
  }
  loadNode (node_id) {
    return new Promise((resolve, reject) => {
      let node = this.nodeList.find(node => node.node_id === node_id)
      let nodeString = ''
      this.ipfs.files.get(node.ipfs_hash, (err, files) => {
        if (err) {
          reject(Error())
        }
        files.forEach(file => { nodeString += file.content.toString() })
        let nodeProperties = JSON.parse(nodeString)
        node.components = nodeProperties.components
        node.data = {}
        node.components.forEach(v => {
          if (v.key) {
            node.data[v.key] = null
          }
        })
        this.ws.emit('client.to.instance', { action: 'updateNodeList' })
        this.emit('nodeListUpdated', {
          nodeList: this.nodeListOnline
        })
        resolve(node)
      })
    })
  }
  call (ws_id, action, parameters) {
    this.ws.emit('client.to.instance', {
      action: 'forward',
      recipient: ws_id,
      parameters: {
        action: action,
        parameters: parameters
      }
    })
  }
  addQueue (node_id, action, parameters) {
    if (this.token) {
      this.ws.emit('client.to.instance', {
        action: 'queue',
        recipient: node_id,
        token: this.token,
        parameters: {
          action: action,
          parameters: parameters
        }
      })
    }
  }
  register (information) {
    this.information = information
    this.ws.emit('client.to.instance', {
      action: 'register',
      parameters: {
        information: this.information
      }
    })
  }
  login (token) {
    this.token = token
    this.ws.emit('client.to.instance', {
      action: 'login',
      parameters: {
        token: this.token
      }
    })
  }
  async processQueueRequest (request) {
    await this.loadNode(request.sender)
    
    this.nodeListOnline = this.nodeListOnline.map((v) => {
      if (request.sender === v.node_id) {
        if (request.content._key) {
          if (v.data) {
            v.data[request.content._key] = request.content._data
          }
        }
      }
      return v
    })
    
    this.emit('nodeListUpdated', {
      nodeList: this.nodeListOnline
    })
    
    this.ws.emit('client.to.instance', {
      action: 'processQueue',
      parameters: {
        queue_id: request.queue_id
      },
      token: this.token
    })
  }
}
