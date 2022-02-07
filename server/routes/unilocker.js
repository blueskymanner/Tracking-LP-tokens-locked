const getETHWeb3 = require('../utils/getETHweb3.js');
const unilockerETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const multicallETH = require('./multicallETH.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");

const nodeCache = require("node-cache");
const myCache = new nodeCache();

const unilockerAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

module.exports = async function UnilockerETH() {

    const web3 = getETHWeb3();
    const unilockerETHPortal = new web3.eth.Contract(unilockerETHabi, unilockerAddressETH);

    let total_tokenNums = await unilockerETHPortal.methods.getNumLockedTokens().call();

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

    const tokenAddrsArr = await unilockerETHPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
    const tokenLocksArr = await unilockerETHPortal.methods.tokenLocks(tokenAddrsArr, 0).call();
    
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
    if (myCache.has( "unilockerCache")) {
        return;
    } else {
        // This section will help you create a new record.
        let db_connect = dbo.getDb("myFirstDatabase");
        let myobj = {
            TokenName: "FTF" + " / " + "WETH",
            Blockchain: "Ethereum",
            Liquidity_Locked: 2471.56,
            Tokens_Locked: 124.09,
            Time_to_unlock: 119,
            Locker: "Unilocker",
            Marketcap: 2657.59,
            Coingecko_Rank: "—",
            Token_TotalAmount: 133.43,
            tokenAddress: "0xf19b55d677187423f8031a5bf0ac7b263b9ff76b"
        };
        db_connect.collection("records").insertOne(myobj, function (err, res) {
            if (err) throw err;
        });
        myCache.set( "unilockerCache", 1 );
    }
}
