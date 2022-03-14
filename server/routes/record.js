const express = require("express");

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require("../db/conn");

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;


// This section will help you get a list of all the records.
recordRoutes.route("/record/").get(async function (req, res) {
  console.log("getting lock test");
  let db_connect = dbo.getDb("myFirstDatabase");
  let recordsNum;

  // await db_connect
  // .collection("records").countDocuments().then((count) => {
  //   recordsNum = count;
  // });
  
  let query = req.query.search ? { $or: [
                                          {"PairToken": {"$regex": req.query.search, '$options' : 'i'}}, 
                                          {"Blockchain": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Liquidity_Locked": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Tokens_Locked": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Locked_Date": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Time_to_unlock": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Locker": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Marketcap": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"Coingecko_Rank": {"$regex": req.query.search, '$options' : 'i'}},
                                          {"TokenName": {"$regex": req.query.search, '$options' : 'i'}},
                                        ] 
                                  } : {};

  await db_connect
  .collection("records").find(query).count().then((count) => {
    recordsNum = count;
  });

  db_connect
    .collection("records")
    .find(query).skip(Number(req.query.page) * Number(req.query.rows)).limit(Number(req.query.rows))
    .toArray(function (err, result) {
      if (err) throw err;
      result.push(recordsNum);
      res.json(result);
    });

});

module.exports = recordRoutes;
