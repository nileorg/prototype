CREATE TABLE nodes (
    node_id INTEGER PRIMARY KEY AUTOINCREMENT,
    token text NOT NULL,
    ipfs_hash text NOT NULL,
    information text
);

CREATE TABLE queue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender INT NOT NULL ,
  recipient INT NOT NULL ,
  content TEXT NOT NULL 
);

CREATE TABLE clients ( 
  client_id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  information TEXT NOT NULL
);