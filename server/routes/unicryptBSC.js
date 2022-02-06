const getBSCWeb3 = require('../utils/getBSCweb3.js');
const unicryptBSCabi = require('../abi/unicryptBSC_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
const multicallBSC = require('./multicallBSC.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const Axios = require('axios');

const nodeCache = require("node-cache");
const myCache = new nodeCache();


const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

module.exports = async function UnicryptBSC() {

  const web3 = getBSCWeb3();
  const unicryptBSCPortal = new web3.eth.Contract(unicryptBSCabi, unicryptAddressBSC);


  cron.schedule('* * * * *', async () => {
    let total_tokenNums = await unicryptBSCPortal.methods.getNumLockedTokens().call();
    console.log(total_tokenNums);
    
      let tokenData0;
      let tokenData1;
      let datainfo0;
      let datainfo1;
      let LPtokens = [];

      const tokenAddrsArr = await unicryptBSCPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
      const tokenLocksArr = await unicryptBSCPortal.methods.tokenLocks(tokenAddrsArr, 0).call();

      LPtokens.push({address: tokenAddrsArr, name: "token0"});
      LPtokens.push({address: tokenAddrsArr, name: "token1"});
      LPtokens.push({address: tokenAddrsArr, name: "decimals"});
      LPtokens.push({address: tokenAddrsArr, name: "getReserves"});
      LPtokens.push({address: tokenAddrsArr, name: "totalSupply"});

      const LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);

      await fetch('https://api.thegraph.com/subgraphs/name/pancakeswap/pairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
          query {
            token(id: "${LPtokensArr[0][0].toLowerCase()}"){
              decimals
            }
          }
          `
        }),
      })
        .then((res) => res.json())
        .then((result) => tokenData0 = result.data.token);
        
      await fetch('https://api.thegraph.com/subgraphs/name/pancakeswap/pairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
          query {
            token(id: "${LPtokensArr[1][0].toLowerCase()}"){
              decimals
            }
          }
          `
        }),
      })
        .then((res) => res.json())
        .then((result) => tokenData1 = result.data.token);


      let apiurl0 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[0][0]}`;
      try {
        await Axios.get(apiurl0).then(entry => 
          datainfo0 = entry);
          // console.log(datainfo0.data.data.symbol);
      } catch(err) {
        console.log("Can't find token0 info.(unicryptBSC)");
        return;
      }

      let apiurl1 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[1][0]}`;
      try{
        await Axios.get(apiurl1).then(entry => 
          datainfo1 = entry);
          // console.log(datainfo1.data.data.symbol);
      } catch(err) {
        console.log("Can't find token1 info.(unicryptBSC)");
        return;
      }


      let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
      let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
      let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));
      let period = new BigNumber(tokenLocksArr[3]).minus(LPtokensArr[3][2]).dividedBy(86400);
      

      if(myCache.has( "unicryptBSCCache")) {
        if(myCache.get( "unicryptBSCCache" ) == total_tokenNums) {
          return;
        } else {
          // This section will help you create a new record.
          let db_connect = dbo.getDb("myFirstDatabase");
          let myobj = {
            TokenName: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
            Blockchain: "BSC",
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
          myCache.set( "unicryptBSCCache", total_tokenNums );
        }
      } else {
        // This section will help you create a new record.
        let db_connect = dbo.getDb("myFirstDatabase");
        let myobj = {
          TokenName: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
          Blockchain: "BSC",
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
        myCache.set( "unicryptBSCCache", total_tokenNums );
      }
  });
}
