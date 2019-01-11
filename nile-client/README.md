**This is just a prototype**
# Nile Client

The client is used to browse the nodes in the local instance and call their actions

## Configuring

The node list comes from the IPFS hash passed in the constructor of the `Client` class `dist/index.html:63`.
You need to replace that hash with the one you get each time a new node register to the local instance inside to local instance process.

When a new node is registered, you will see this log inside the local instance process:

```New nodes list published, the ipfs hash is: QmTzFkFVXPfkKndVJzVDh4xmsXEjXtn3YHszmqE4iauMjt```

## Running

_Optional:_

Compile latest version using webpack by simply running `webpack`.

Open ```dist/index.html``` in the browser.

## How it works

### Nodes properties

Each node has the following properties:

* **node_id**: its unique identifier
* **node name**: basic information
* **node ipfs hash**: a hash used to load the node's components
* **components**: a set of components used to exchange information between the node and the client
* **data**: an object containing the data of the component, this object is filled both by the client and the node when they exchange informaton. Explained in detail in the next section.

### Data

The data object is a property of the node object of the client.
The data object is the object used by the node and the client to exchange information. How the information is exchanged is defined by the node when it defines the components:

```javascript
node.components = [
    {
        type: "button",
        action: "function1",
        parameters: ['inp1'],
        label: "Call function1"
    },
    {
        type: "text",
        key: "inp1"
    },
    {
        type: "output",
        key: "out1"
    }
]
```
* The second component "```type: "text"```" has a property ```key```: it defines that the value of the text component should go to ```node.data[inp1]```
* The third component "```type: "output"```" has a property ```key```: it defines that the value inside ```node.data[out1]``` should be displayed in the output component
* The first component "```type: "button"```" has a property ```parameters```: it defines that when the client send the request to the node it should pass ```node.data[inp1]```

## Developing
Each time you edit the ```src/client.js``` remember to run ```webpack```.
