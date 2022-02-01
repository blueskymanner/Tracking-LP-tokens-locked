import React, {useEffect, useState} from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
import UnicryptETH from './unicryptETH.js';
import UnicryptBSC from './unicryptBSC.js';
import DeepLocker from './deepLocker.js';
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
      initialState: { pageSize: 10 }
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
            {[10, 20, 30, 40].map((pageSize) => (
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
  const [ethtoken, setEthtoken] = useState([]);
  const [bsctoken, setBsctoken] = useState([]);
  const [deeptoken, setDeeptoken] = useState([]);
  useEffect(() => {
    UnicryptETH().then(resp =>
    {
      setEthtoken(resp);
    });
    UnicryptBSC().then(resp =>
    {
      setBsctoken(resp);
    });
    DeepLocker().then(resp =>
      {
        setDeeptoken(resp);
    });
  }, []);

  const columns = React.useMemo(
    () => [
      {
        Header: "Token Name ↓↑",
        accessor: "first"
      },
      {
        Header: "Blockchain ↓↑",
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
        Header: "Time to unlock ↓↑",
        accessor: "fifth"
      },
      {
        Header: "Locker ↓↑",
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
        Header: "Score ↓↑",
        accessor: "ninth"
      }
    ],
    []
  );

  const data = React.useMemo(
    () => { if(ethtoken.length || bsctoken.length || deeptoken.length) {
              let tokensInfo = [];
              for(let i = 0; i < ethtoken.length; i++) {
                tokensInfo.push(
                  {
                    first: ethtoken[i].tokenName,
                    second: ethtoken[i].blockchain,
                    third: ethtoken[i].lockedPrice,
                    fourth: ethtoken[i].lockedAmount,
                    fifth: ethtoken[i].unlockPeriod,
                    sixth: ethtoken[i].locker,
                    seventh: ethtoken[i].marketCap,
                    eighth: ethtoken[i].rank,
                    ninth: ethtoken[i].score
                  }
                );
              }
              for(let i = 0; i < bsctoken.length; i++) {
                tokensInfo.push(
                  {
                    first: bsctoken[i].tokenName,
                    second: bsctoken[i].blockchain,
                    third: bsctoken[i].lockedPrice,
                    fourth: bsctoken[i].lockedAmount,
                    fifth: bsctoken[i].unlockPeriod,
                    sixth: bsctoken[i].locker,
                    seventh: bsctoken[i].marketCap,
                    eighth: bsctoken[i].rank,
                    ninth: bsctoken[i].score
                  }
                );
              }
              for(let i = 0; i < deeptoken.length; i++) {
                tokensInfo.push(
                  {
                    first: deeptoken[i].tokenName,
                    second: deeptoken[i].blockchain,
                    third: deeptoken[i].lockedPrice,
                    fourth: deeptoken[i].lockedAmount,
                    fifth: deeptoken[i].unlockPeriod,
                    sixth: deeptoken[i].locker,
                    seventh: deeptoken[i].marketCap,
                    eighth: deeptoken[i].rank,
                    ninth: deeptoken[i].score
                  }
                );
              }

              return tokensInfo;
            } else { let empty = []; for (let i = 0; i < 10; i++) {
                empty.push(
                  {
                    first: empty[i],
                    second: empty[i],
                    third: empty[i],
                    fourth: empty[i],
                    fifth: empty[i],
                    sixth: empty[i],
                    seventh: empty[i],
                    eighth: empty[i],
                    ninth: empty[i]
                  }
                );
              } return empty; }
          },
        [ethtoken, bsctoken, deeptoken]
  );

  return <Actiontable columns={columns} data={data} />;
}

export default Table;
