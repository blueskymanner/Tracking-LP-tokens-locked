import React, {useEffect, useState} from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
import UnicryptETH from './unicryptETH.js';
import '../Style/style.css';

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter
}) {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce(async (value) => {
    setGlobalFilter(value || undefined);
  }, 200);

  return (
    <span>
      Search: {" "}
      <input
        value={value || ""}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={`Enter Keyword`}
      />
    </span>
  );
}

function Actiontable({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    footerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
    state,
    preGlobalFilteredRows,
    setGlobalFilter
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 20 }
    },
    useGlobalFilter, useSortBy, usePagination
  );

  // Render the UI for your table
  return (
    <>
      <div className="content">
        <div className="tablesection">
          <table
            {...getTableProps()}
          >
            <thead>
              <tr>
                <th
                  colSpan={100}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    background: "yellow"
                  }}
                >
                  <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                  />
                </th>
              </tr>

              {headerGroups.map((group) => (
                <tr {...group.getHeaderGroupProps()}>
                  {group.headers.map((column) => (
                    <th {...column.getHeaderProps(column.getSortByToggleProps())}>{column.render("Header")}
                    {/* <span>{
                      column.isSorted
                          ? column.isSortedDesc
                                ? ' ?'
                                : ' ?'
                          : ''
                    }</span> */}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {page.map((row, i) => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()}>
                    {row.cells.map((cell) => {
                      return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
            {/* <tfoot>
              {footerGroups.map((group) => (
                <tr {...group.getFooterGroupProps()}>
                  {group.headers.map((column) => (
                    <td {...column.getFooterProps()}>{column.render("Footer")}</td>
                  ))}
                </tr>
              ))}
            </tfoot> */}
          </table>
        </div>

        <div className="pagination">
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => previousPage()} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={() => nextPage()} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {">>"}
          </button>{" "}
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageCount}
            </strong>{" "}
          </span>
          <span>
            | Go to page:{" "}
            <input
              type="number"
              defaultValue={pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                gotoPage(page);
              }}
              style={{ width: "100px" }}
            />
          </span>{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
            }}
          >
            {[20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

function Table() {
  const [tokenInfo, setTokenInfo] = useState([]);
    UnicryptETH().then(resp =>
    {
      setTokenInfo(resp);
    });
    
  const columns = React.useMemo(
    () => [
      {
        Header: "Token Name",
        accessor: "first"
      },
      {
        Header: "Blockchain",
        accessor: "second"
      },
      {
        Header: "Liquidity Locked $",
        accessor: "third"
      },
      {
        Header: "Tokens Locked %",
        accessor: "fourth"
      },
      {
        Header: "Time to unlock",
        accessor: "fifth"
      },
      {
        Header: "Locker",
        accessor: "sixth"
      },
      {
        Header: "Marketcap $",
        accessor: "seventh"
      },
      {
        Header: "Coingecko Rank #",
        accessor: "eighth"
      },
      {
        Header: "Score",
        accessor: "ninth"
      }
    ],
    []
  );

  const data = React.useMemo(
    () => { if(tokenInfo.length) {
              let tokensInfo = [];
              for(let i = 0; i < tokenInfo.length; i++) {
                tokensInfo.push(
                  {
                    first: tokenInfo[i].tokenName,
                    second: tokenInfo[i].blockchain,
                    third: tokenInfo[i].lockedPrice,
                    fourth: tokenInfo[i].lockedAmount,
                    fifth: tokenInfo[i].unlockPeriod,
                    sixth: tokenInfo[i].locker,
                    seventh: tokenInfo[i].marketCap,
                    eighth: tokenInfo[i].rank,
                    ninth: tokenInfo[i].score
                  }
                );
              }
              return tokensInfo;
            } else { return []; }
          },
        [tokenInfo]
  );

  return <Actiontable columns={columns} data={data} />;
}

export default Table;











// import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import unicryptETHabi from "../abi/unicryptETH_abi.json";
import uniswapETHabi from "../abi/uniswapETH_abi.json";
import BigNumber from "bignumber.js";
import { createClient } from 'urql'
// import Axios from "axios";

const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

async function UnicryptETH() {
  
    let provider = ethers.getDefaultProvider();
    const unicryptETHPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, provider);
    let total_tokenNums = await unicryptETHPortal.getNumLockedTokens();
  
    const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
    const ethpriceQuery = `
      query {
        bundle(id: "1" ) {
          ethPrice
        }
      }
    `; 
    const client = createClient({
      url: APIURL,
    });
    const ethData = await client.query(ethpriceQuery).toPromise();
    let ethPrice = ethData.data.bundle.ethPrice;
  
    let tokenAddr = [];
    const uniswapETHPortal = [];
    let token0Addr = [];
    let token1Addr = [];
    let LPdecimals = [];
    const tokensQuery0 = [];
    const tokensQuery1 = [];
    const tokenData0 = [];
    let decimals0 = [];
    let token0Symbol = [];
    let token0DerivedETH = [];
    const tokenData1 = [];
    let decimals1 = [];
    let token1Symbol = [];
    let token1DerivedETH = [];
    let tokenReserves = [];
    let tokenLockdata = [];
    let total_supply = [];
    let percentage = [];
    let token0Price = [];
    let token1Price = [];
    let period = [];
  
    let tokensinfo = [];
  
    for (let i = 0; i < 10; i++) {
      tokenAddr[i] = await unicryptETHPortal.getLockedTokenAtIndex(total_tokenNums - i - 1);
  
      uniswapETHPortal[i] = new ethers.Contract(tokenAddr[i], uniswapETHabi, provider);
      token0Addr[i] = await uniswapETHPortal[i].token0();
      token1Addr[i] = await uniswapETHPortal[i].token1();
      LPdecimals[i] = await uniswapETHPortal[i].decimals();
  
      // let apiurl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token1Addr}`;
      // const { data: datainfo } = await Axios.get(apiurl);
      // console.log(datainfo.market_data.current_price.usd);
  
      tokensQuery0[i] = `
        query {
          token(id: "${token0Addr[i].toLowerCase()}"){
            symbol
            decimals
            derivedETH
          }
        }
      `;
      tokensQuery1[i] = `
        query {
          token(id: "${token1Addr[i].toLowerCase()}"){
            symbol
            decimals
            derivedETH
          }
        }
      `;

      tokenData0[i] = await client.query(tokensQuery0[i]).toPromise();
      decimals0[i] = tokenData0[i].data.token.decimals;
      token0Symbol[i] = tokenData0[i].data.token.symbol;
      token0DerivedETH[i] = tokenData0[i].data.token.derivedETH;

      tokenData1[i] = await client.query(tokensQuery1[i]).toPromise();
      decimals1[i] = tokenData1[i].data.token.decimals;
      token1Symbol[i] = tokenData1[i].data.token.symbol;
      token1DerivedETH[i] = tokenData1[i].data.token.derivedETH;
      
      tokenReserves[i] = await uniswapETHPortal[i].getReserves();
      tokenLockdata[i] = await unicryptETHPortal.tokenLocks(tokenAddr[i], 0);
      total_supply[i] = await uniswapETHPortal[i].totalSupply();

      percentage[i] = new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).dividedBy(new BigNumber(total_supply[i]._hex).dividedBy(10**LPdecimals[i]));
      token0Price[i] = new BigNumber(tokenReserves[i][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(token0DerivedETH[i])).multipliedBy(ethPrice);
      token1Price[i] = new BigNumber(tokenReserves[i][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(token1DerivedETH[i])).multipliedBy(ethPrice);
      period[i] = new BigNumber(tokenLockdata[i][3]._hex).minus(new BigNumber(tokenLockdata[i][0]._hex)).dividedBy(86400);

      tokensinfo.push({ tokenName: token0Symbol[i] + " / " + token1Symbol[i], 
                        blockchain: "Ethereum",
                        lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0), 
                        lockedAmount: new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).toFormat(4) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)", 
                        unlockPeriod: period[i].toFormat(0) + "days", 
                        locker: "Unicrypt", 
                        marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0), 
                        rank: " ", 
                        score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0) });
    }

    return tokensinfo;
  }

export default UnicryptETH;










// import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import unicryptBSCabi from "../abi/unicryptBSC_abi.json";
import pancakeswapBSCabi from "../abi/pancakeswapBSC_abi.json";
import BigNumber from "bignumber.js";
import { createClient } from 'urql'
// import Axios from "axios";

const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

async function UnicryptBSC() {
  
    let provider = ethers.getDefaultProvider();
    const unicryptBSCPortal = new ethers.Contract(unicryptAddressBSC, unicryptBSCabi, provider);
    let total_tokenNums = await unicryptBSCPortal.getNumLockedTokens();
  
    const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
    const ethpriceQuery = `
      query {
        bundle(id: "1" ) {
          ethPrice
        }
      }
    `; 
    const client = createClient({
      url: APIURL,
    });
    const ethData = await client.query(ethpriceQuery).toPromise();
    let ethPrice = ethData.data.bundle.ethPrice;
  
    let tokenAddr = [];
    const pancakeswapBSCPortal = [];
    let token0Addr = [];
    let token1Addr = [];
    let LPdecimals = [];
    const tokensQuery0 = [];
    const tokensQuery1 = [];
    const tokenData0 = [];
    let decimals0 = [];
    let token0Symbol = [];
    let token0DerivedETH = [];
    const tokenData1 = [];
    let decimals1 = [];
    let token1Symbol = [];
    let token1DerivedETH = [];
    let tokenReserves = [];
    let tokenLockdata = [];
    let total_supply = [];
    let percentage = [];
    let token0Price = [];
    let token1Price = [];
    let period = [];
  
    let tokensinfo = [];
  
    for (let i = 0; i < 10; i++) {
      tokenAddr[i] = await unicryptBSCPortal.getLockedTokenAtIndex(total_tokenNums - i - 1);

      pancakeswapBSCPortal[i] = new ethers.Contract(tokenAddr[i], pancakeswapBSCabi, provider);
      token0Addr[i] = await pancakeswapBSCPortal[i].token0();
      token1Addr[i] = await pancakeswapBSCPortal[i].token1();
      LPdecimals[i] = await pancakeswapBSCPortal[i].decimals();
  
      // let apiurl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token1Addr}`;
      // const { data: datainfo } = await Axios.get(apiurl);
      // console.log(datainfo.market_data.current_price.usd);

      tokensQuery0[i] = `
        query {
          token(id: "${token0Addr[i].toLowerCase()}"){
            symbol
            decimals
            derivedETH
          }
        }
      `;
      tokensQuery1[i] = `
        query {
          token(id: "${token1Addr[i].toLowerCase()}"){
            symbol
            decimals
            derivedETH
          }
        }
      `;

      tokenData0[i] = await client.query(tokensQuery0[i]).toPromise();
      decimals0[i] = tokenData0[i].data.token.decimals;
      token0Symbol[i] = tokenData0[i].data.token.symbol;
      token0DerivedETH[i] = tokenData0[i].data.token.derivedETH;

      tokenData1[i] = await client.query(tokensQuery1[i]).toPromise();
      decimals1[i] = tokenData1[i].data.token.decimals;
      token1Symbol[i] = tokenData1[i].data.token.symbol;
      token1DerivedETH[i] = tokenData1[i].data.token.derivedETH;
      
      tokenReserves[i] = await pancakeswapBSCPortal[i].getReserves();
      tokenLockdata[i] = await unicryptBSCPortal.tokenLocks(tokenAddr[i], 0);
      total_supply[i] = await pancakeswapBSCPortal[i].totalSupply();

      percentage[i] = new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).dividedBy(new BigNumber(total_supply[i]._hex).dividedBy(10**LPdecimals[i]));
      token0Price[i] = new BigNumber(tokenReserves[i][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(token0DerivedETH[i])).multipliedBy(ethPrice);
      token1Price[i] = new BigNumber(tokenReserves[i][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(token1DerivedETH[i])).multipliedBy(ethPrice);
      period[i] = new BigNumber(tokenLockdata[i][3]._hex).minus(new BigNumber(tokenLockdata[i][0]._hex)).dividedBy(86400);

      tokensinfo.push({ tokenName: token0Symbol[i] + " / " + token1Symbol[i], 
                        blockchain: "Ethereum",
                        lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0), 
                        lockedAmount: new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).toFormat(2) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)", 
                        unlockPeriod: period[i].toFormat(0) + "days", 
                        locker: "Unicrypt", 
                        marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0), 
                        rank: " ", 
                        score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0) });
    }

    return tokensinfo;
  }

export default UnicryptBSC;
