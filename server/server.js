

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 5000;
app.use(cors({origin: "http://localhost:3000"}));
app.use(express.json());
app.use(require("./routes/record"));
// get driver connection
const dbo = require("./db/conn");

app.listen(port, () => {
  // perform a database connection when server starts
  dbo.connectToServer(function (err) {
    if (err) console.error(err);

  });
  console.log(`Server is running on port: ${port}`);
});

const UnicryptETH = require('./routes/unicryptETH.js');
const UnicryptBSC = require('./routes/unicryptBSC.js');
const DeepLocker = require('./routes/deepLocker.js');
const CryptexLock = require('./routes/cryptexlock.js');
// const UnilockerETH = require('./routes/unilocker.js');

// UnicryptETH();
UnicryptBSC();
DeepLocker();
CryptexLock();
// UnilockerETH();