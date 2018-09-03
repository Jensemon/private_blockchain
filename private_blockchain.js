// import levelDB
const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// import crypto js
const SHA256 = require('crypto-js/sha256');

class Block {
  constructor(data) {
    this.hash = "",
    this.height = 0,
    this.body = data,
    this.time = 0,
    this.previousBlockHash = ""
  }
}

class Blockchain {
  constructor() {
    let self = this;
    // check if database has the genesis block;
    db.get("0")
      .catch( err => {
        if (err) {
          self.addBlock(new Block("The Genesis Block"));
        }
      })
  }


  // Create a new block on the chain
  addBlock(newBlock) {
    // use to store current block height
    let blockHeight;

    // find current block height
    db.get("blockHeight")
    .then( height => {
      blockHeight = parseInt(height);
        // return block at current blockheight as promise
        return db.get(height);
    })
    .then( block => {
      // set the newBlocks previous hash to the previous hash
      newBlock.previousBlockHash = JSON.parse(block).hash;
      // pass current blockheight to makeBlock function
      makeBlock(blockHeight);
    })
    // initialize blockchain
    .catch( err => {
      console.log(`Block height not found, create new genesis block || err: ${err}`);
      makeBlock();
    })

    function makeBlock(blockHeight = -1) {
      // set height for next block to be added
      let height = blockHeight + 1;
      // set block height
      newBlock.height = height;
      // UTC timestamp
      newBlock.time = new Date().getTime().toString().slice(0, -3);
      // Block hash with SHA256 using newBlock and converting to a string
      newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
      
      // store the current blockheight of the blockchain
      db.put("blockHeight", height)
        // add block object to chain
        .then( () => {
          db.put(height, JSON.stringify(newBlock))
            .then( () => console.log(`Added block ${height} to chain`))
            .catch( err => console.log(`could not write block to DB, err: ${err}`))
        })
        .catch( err => console.log(`Couldn't write to "blockHeight", err: ${err}`));
    }
  }

  // Get block height
  getBlockHeight() {
    return db.get("blockHeight")
      .then(value => console.log(value))
      .catch(err => console.log(`Can't find the blockHeight`))
  }

  // get block
  getBlock(blockHeight) {
    return db.get(blockHeight)
      .then( (block) => {
        // console.log(JSON.parse(block))
        // returns the block object as a promise
        return JSON.parse(block)
      })
      .catch( (err) => console.log(`Can't find block of height ${blockHeight}, err: ${err}`))
  }

  // validate block
  validateBlock(blockHeight) {
    let statedHash;

    // get block
    this.getBlock(blockHeight)
      // the promise is returned in parsed format
      .then( block => {
        // store block.hash, remove it, recreate it, compare it
        statedHash = block.hash;
        block.hash = "";
        block.hash = SHA256(JSON.stringify(block)).toString();
        
        // compare and log result
        if (statedHash !== block.hash) {
          console.log(`Invalid block at block height #${ blockHeight }`);
        } else {
          console.log(`Block #${ blockHeight } is valid`);
        }
      })
      .catch( () => console.log(`Can't retreive block #${blockHeight} for validation`))
  }

  validateChain(promise, obj) {
    // if arguments are missing
    if (!arguments.length) {
      // set up a new object
      const obj = {};
      // give it a counter and error log
      obj.i = 0;
      obj.errLog = [];
      obj.previousBlockHash = "";
      // get the blockchain length
      db.get("blockHeight")
        .then((height) => {
          // and store the blockchain lenght in the object
          obj.height = parseInt(height);
          // start recursion by passing a promise and the storage object
          this.validateChain(db.get(obj.i), obj)
        })
        .catch( () => console.log(`Can't get blockheight for setting up chain validation`))
    }
    // if in recursion handle the promise 
    else  {
      // handle the promise containing block# obj.i
      promise
        .then(value => {
          // parse the block
          let block = JSON.parse(value);
          
          // store hash, remove hash, recreate hash
          obj.hash = block.hash;
          block.hash = "";
          block.hash = SHA256(JSON.stringify(block)).toString();
          
          // check block.previousBlockHash [written in the block being handled] against obj.previousBlockHash [stored in the passed object]
          if (block.previousBlockHash !== obj.previousBlockHash || block.hash !== obj.hash) {
            obj.errLog.push(block.height);
          }
          
          if (obj.i < obj.height) {
            // increment the counter
            obj.i++
            // save the previous blockhash
            obj.previousBlockHash = obj.hash;
            // recursion call
            this.validateChain(db.get(obj.i), obj)
          }
          else {
            // change this to change case if obj.errLog.length < 1;
            console.log(`Errors found on these blocks ${obj.errLog}`);
          }
      })
      .catch( () => console.log(`Erroneous promise passed as param to validateChain()`))
    }
  }
}

let blockchain = new Blockchain();

// testing
(function () {
  setTimeout(function () {
    // blockchain.validateChain();
    // blockchain.validateBlock(0);
    // blockchain.validateBlock(1);
    // blockchain.validateBlock(2);
    // blockchain.validateBlock(3);
    blockchain.addBlock(new Block('This is block 1'));
  }, 100)
})()
