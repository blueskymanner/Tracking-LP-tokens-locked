const getETHWeb3 = require('../utils/getETHweb3.js');
const unicryptETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const multicallETH = require('./multicallETH.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const nodeCache = require("node-cache");
// const Axios = require('axios');


const myCache = new nodeCache();
myCache.set( "prev_TotalNums", 0 );


const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

module.exports = async function UnicryptETH() {

  const web3 = getETHWeb3();
  const unicryptETHPortal = new web3.eth.Contract(unicryptETHabi, unicryptAddressETH);
  // let prev_TotalNums = 0;


  cron.schedule('* * * * *', async () => {
    let total_tokenNums = await unicryptETHPortal.methods.getNumLockedTokens().call();
    console.log(total_tokenNums);

    let ethPrice;
    await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            bundle(id: "1" ) {
              ethPrice
            }
          }
        `
      }),
    })
      .then((res) => res.json())
      .then((result) => ethPrice = result.data.bundle.ethPrice);

    let cacheValue = myCache.get( "prev_TotalNums" );
    console.log(cacheValue);

    if (cacheValue == total_tokenNums) {
      console.log("very equal to unicryptETH."); 
      return;
    }

    else {
      console.log("very different to unicryptETH.");
      
      myCache.set( "prev_TotalNums", total_tokenNums );
      cacheValue = myCache.get( "prev_TotalNums" );
      console.log(cacheValue);

      let tokenData0;
      let tokenData1;
      let LPtokens = [];

      const tokenAddrsArr = await unicryptETHPortal.methods.getLockedTokenAtIndex(cacheValue - 1).call();
      const tokenLocksArr = await unicryptETHPortal.methods.tokenLocks(tokenAddrsArr, 0).call();
      
      LPtokens.push({address: tokenAddrsArr, name: "token0"});
      LPtokens.push({address: tokenAddrsArr, name: "token1"});
      LPtokens.push({address: tokenAddrsArr, name: "decimals"});
      LPtokens.push({address: tokenAddrsArr, name: "getReserves"});
      LPtokens.push({address: tokenAddrsArr, name: "totalSupply"});

      const LPtokensArr = await multicallETH(uniswapETHabi, LPtokens);

      await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              token(id: "${LPtokensArr[0][0].toLowerCase()}"){
                symbol
                decimals
                derivedETH
              }
            }
          `
        }),
      })
        .then((res) => res.json())
        .then((result) => tokenData0 = result.data.token);

      await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              token(id: "${LPtokensArr[1][0].toLowerCase()}"){
                symbol
                decimals
                derivedETH
              }
            }
          `
        }),
      })
        .then((res) => res.json())
        .then((result) => tokenData1 = result.data.token);

      let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
      let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(tokenData0.derivedETH)).multipliedBy(ethPrice);
      let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(tokenData1.derivedETH)).multipliedBy(ethPrice);
      let period = new BigNumber(tokenLocksArr[3]).minus(LPtokensArr[3][2]).dividedBy(86400);

      // This section will help you create a new record.
      let db_connect = dbo.getDb("myFirstDatabase");
      let myobj = {
        TokenName: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Locked: "$" + token0Price.plus(token1Price).multipliedBy(percentage).toFormat(0),
        Tokens_Locked: new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).toFormat(2) + " (" + percentage.multipliedBy(100).toFormat(1) + "%)",
        Time_to_unlock: period.toFormat(0) + " days left",
        Locker: "Unicrypt",
        Marketcap: "$" + token0Price.plus(token1Price).toFormat(0),
        Coingecko_Rank: "—",
        Score: token0Price.plus(token1Price).multipliedBy(percentage).multipliedBy(period).multipliedBy(percentage).toFormat(0)
      };
      db_connect.collection("records").insertOne(myobj, function (err, res) {
        if (err) throw err;
      });
    }
  });
}