const express = require("express");

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require("../db/conn");

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;

let UnicryptETH = require('./unicryptETH.js');
let UnicryptBSC = require('./unicryptBSC.js');
let DeepLocker = require('./deepLocker.js');
let UnilockerETH = require('./unilocker.js');

// This section will help you get a list of all the records.
recordRoutes.route("/record").get(function (req, res) {
  console.log("getting lock test");
  // UnicryptETH();
  UnicryptBSC();
  // DeepLocker();
  // UnilockerETH();
  let db_connect = dbo.getDb("myFirstDatabase");
  db_connect
    .collection("records")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

module.exports = recordRoutes;
