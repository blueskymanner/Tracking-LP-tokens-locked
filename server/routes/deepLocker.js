const getBSCWeb3 = require('../utils/getBSCweb3.js');
const deepLockerabi = require('../abi/deepLocker_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
const BigNumber = require("bignumber.js");
const multicallBSC = require('./multicallBSC.js');
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const Axios = require('axios');

const nodeCache = require("node-cache");
const myCache = new nodeCache();


const deepLockerAddr = "0x3f4D6bf08CB7A003488Ef082102C2e6418a4551e";

module.exports = async function DeepLocker() {

    const web3 = getBSCWeb3();
    const deepLockerPortal = new web3.eth.Contract(deepLockerabi, deepLockerAddr);

    cron.schedule('* * * * *', async () => {
        let total_tokenNums = await deepLockerPortal.methods.depositId().call();

        let tokenData0;
        let tokenData1;
        let datainfo0;
        let datainfo1;
        let LPtokens = [];

        let tokenLocksArr = await deepLockerPortal.methods.lockedToken(total_tokenNums).call();
        let pancakeApiurl = `https://api.pancakeswap.info/api/v2/tokens/${tokenLocksArr[0]}`;
        try {
            await Axios.get(pancakeApiurl);
        } catch(err) {
            LPtokens.push({address: tokenLocksArr[0], name: "token0"});
            LPtokens.push({address: tokenLocksArr[0], name: "token1"});
            LPtokens.push({address: tokenLocksArr[0], name: "decimals"});
            LPtokens.push({address: tokenLocksArr[0], name: "getReserves"});
            LPtokens.push({address: tokenLocksArr[0], name: "totalSupply"});
        }
        const LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);

        let apiurl0 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[0][0]}`;
        try {
            await Axios.get(apiurl0).then(entry => 
            datainfo0 = entry);
        } catch(err) {
            return;
        }

        let apiurl1 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[1][0]}`;
        try {
            await Axios.get(apiurl1).then(entry => 
            datainfo1 = entry);
        } catch(err) {
            return;
        }

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

        let percentage = new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
        let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
        let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));
        let period = new BigNumber(tokenLocksArr[3]).minus(LPtokensArr[3][2]).dividedBy(86400);

        if(myCache.has( "deeplockerCache")) {
            if(myCache.get( "deeplockerCache" ) == total_tokenNums) {
              return;
            } else {
            // This section will help you create a new record.
            let db_connect = dbo.getDb("myFirstDatabase");
            let myobj = {
                TokenName: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Locked: "$" + token0Price.plus(token1Price).multipliedBy(percentage).toFormat(0), 
                Tokens_Locked: new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).toFormat(2) + " (" + percentage.multipliedBy(100).toFormat(1) + "%)", 
                Time_to_unlock: period.toFormat(0) + " days left", 
                Locker: "DeepLocker",
                Marketcap: "$" + token0Price.plus(token1Price).toFormat(0), 
                Coingecko_Rank: "—", 
                Score: token0Price.plus(token1Price).multipliedBy(percentage).multipliedBy(period).multipliedBy(percentage).toFormat(0)
            };
            db_connect.collection("records").insertOne(myobj, function (err, res) {
                if (err) throw err;
            });
            myCache.set( "deeplockerCache", total_tokenNums );
            }
          } else {
            // This section will help you create a new record.
            let db_connect = dbo.getDb("myFirstDatabase");
            let myobj = {
                TokenName: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Locked: "$" + token0Price.plus(token1Price).multipliedBy(percentage).toFormat(0), 
                Tokens_Locked: new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).toFormat(2) + " (" + percentage.multipliedBy(100).toFormat(1) + "%)", 
                Time_to_unlock: period.toFormat(0) + " days left", 
                Locker: "DeepLocker",
                Marketcap: "$" + token0Price.plus(token1Price).toFormat(0), 
                Coingecko_Rank: "—", 
                Score: token0Price.plus(token1Price).multipliedBy(percentage).multipliedBy(period).multipliedBy(percentage).toFormat(0)
            };
            db_connect.collection("records").insertOne(myobj, function (err, res) {
                if (err) throw err;
            });
            myCache.set( "deeplockerCache", total_tokenNums );
          }
    });
}
