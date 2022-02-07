const getETHWeb3 = require('../utils/getETHweb3.js');
const unicryptETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const multicallETH = require('./multicallETH.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");

const nodeCache = require("node-cache");
const myCache = new nodeCache();
// const Axios = require('axios');


const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

module.exports = async function UnicryptETH() {

  const web3 = getETHWeb3();
  const unicryptETHPortal = new web3.eth.Contract(unicryptETHabi, unicryptAddressETH);

  cron.schedule('* * * * *', async () => {
    let total_tokenNums = await unicryptETHPortal.methods.getNumLockedTokens().call();

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

      let tokenData0;
      let tokenData1;
      let LPtokens = [];

      const tokenAddrsArr = await unicryptETHPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
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

      const epochNum = new Date(tokenLocksArr[3] * 1000);
      let unlockDate = epochNum.toLocaleDateString();

      if(myCache.has( "unicryptETHCache")) {
        if(myCache.get( "unicryptETHCache" ) == total_tokenNums) {
          return;
        } else {
          // This section will help you create a new record.
          let db_connect = dbo.getDb("myFirstDatabase");
          let myobj = {
            TokenName: tokenData0.symbol + " / " + tokenData1.symbol,
            Blockchain: "Ethereum",
            Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0),
            Tokens_Locked: new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
            Time_to_unlock: unlockDate,
            Locker: "Unicrypt",
            Marketcap: token0Price.plus(token1Price).toFixed(0),
            Coingecko_Rank: "—",
            Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
            tokenAddress: tokenAddrsArr
          };
          db_connect.collection("records").insertOne(myobj, function (err, res) {
            if (err) throw err;
          });
          myCache.set( "unicryptETHCache", total_tokenNums );
        }
      } else {
        // This section will help you create a new record.
        let db_connect = dbo.getDb("myFirstDatabase");
        let myobj = {
          TokenName: tokenData0.symbol + " / " + tokenData1.symbol,
          Blockchain: "Ethereum",
          Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0),
          Tokens_Locked: new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
          Time_to_unlock: unlockDate,
          Locker: "Unicrypt",
          Marketcap: token0Price.plus(token1Price).toFixed(0),
          Coingecko_Rank: "—",
          Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
          tokenAddress: tokenAddrsArr
        };
        db_connect.collection("records").insertOne(myobj, function (err, res) {
          if (err) throw err;
        });
        myCache.set( "unicryptETHCache", total_tokenNums );
      }
  });
}
