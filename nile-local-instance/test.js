const LocalInstance = require('./localinstance')
const fs = require('fs')
let path = require('path')

const server = require('http').createServer((request, response) => {
	let filePath = path.join(__dirname, 'ipfs_hash');
	fs.readFile(filePath, 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		response.end(data)
	});
});
const ws = require('socket.io')(server);
server.listen(3334);
const IPFS = require('ipfs')


const node = new IPFS({
	repo: "instance1",
	config: {
		Addresses: {
			Swarm: ['/ip4/0.0.0.0/tcp/0'],
		},
	}
})
console.log("Loading IPFS...")
node.on('ready', () => {
	console.log("LOCAL INSTANCE")
	const localInstance = new LocalInstance(ws, node)
	ws.on("connection", (socket)=>{
		console.log(socket.id + " joined the network");
		localInstance.setSocket(socket)
	})
})