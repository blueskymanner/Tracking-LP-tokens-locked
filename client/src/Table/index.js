import React, {useEffect, useState} from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
import '../Style/style.css';
import Axios from "axios";


const scan_link = {
  Ethereum: "https://etherscan.io/",
  BSC: "https://bscscan.com/"
};

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

function Actiontable({ columns, data, pageNo, setPageIndex }) {
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
      initialState: { pageSize: 10, pageIndex: pageNo }
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
                    <span>{
                      column.isSorted
                          ? column.isSortedDesc
                                ? ' 🔽'
                                : ' 🔼'
                          : ''
                    }</span>
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
                    {row.cells.map((cell, j) => {
                      if (j === 0) {
                        return <td key={j}><a href={row.values.third === 'BSC' ? scan_link['BSC'] + "token/" + row.values.first[1] : scan_link['Ethereum'] + "token/" + row.values.first[1]} target="_blank">{row.values.first[0]}</a></td>
                      }
                      else if (j === 1) {
                        return <td key={j}><a href={row.values.third === 'BSC' ? scan_link['BSC'] + "address/" + row.values.second[1] : scan_link['Ethereum'] + "address/" + row.values.second[1]} target="_blank">{row.values.second[0]}</a></td>
                      }
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
          <button onClick={() => {
            gotoPage(0);
            setPageIndex(0);
          }} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => {
            previousPage()
            setPageIndex(pageIndex - 1);
          }} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={() => {
            nextPage()
            setPageIndex(pageIndex + 1);
          }} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => {
            gotoPage(pageCount - 1)
            setPageIndex(pageCount - 1);
          }} disabled={!canNextPage}>
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
  const [records, setRecords] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    const dosth = () => {
      Axios
      .get("http://localhost:5000/record/")
      .then((response) => {
        setRecords(response.data);
        setTimeout(dosth, 60000);
      })
      .catch(function (error) {
        console.log(error);
      });
    }
    dosth();
    return () => clearTimeout(dosth);
  }, []);

  const columns = React.useMemo(
    () => [
      {
        Header: "TokenName",
        accessor: "first"
      },
      {
        Header: "PairToken",
        accessor: "second"
      },
      {
        Header: "Blockchain",
        accessor: "third"
      },
      {
        Header: "Liquidity Locked $",
        accessor: "fourth"
      },
      {
        Header: "Tokens Locked %",
        accessor: "fifth"
      },
      {
        Header: "Locked Date",
        accessor: "sixth"
      },
      {
        Header: "Time to unlock",
        accessor: "seventh"
      },
      {
        Header: "Locker",
        accessor: "eighth"
      },
      {
        Header: "Marketcap $",
        accessor: "ninth"
      },
      {
        Header: "Coin gecko Rank #",
        accessor: "tenth"
      },
      {
        Header: "Score",
        accessor: "eleventh"
      }
    ],
    []
  );
  
  const data = React.useMemo(
    () => {
            let tokensInfo = [];
            records.map((record) => {
              tokensInfo.push(
                {
                  first: [record.TokenName, record.TokenAddress],
                  second: [record.PairToken, record.PairTokenAddress],
                  third: record.Blockchain,
                  fourth: "$" + record.Liquidity_Locked,
                  fifth: record.Tokens_Locked + " (" + (record.Tokens_Locked/record.Token_TotalAmount * 100).toFixed(1) + "%)",
                  sixth: record.Locked_Date,
                  seventh: ((Date.parse(record.Time_to_unlock) - Date.now()) / 86400000 > 0 ? (Date.parse(record.Time_to_unlock) - Date.now()) / 86400000 : 0).toFixed(0) + " days left",
                  eighth: record.Locker,
                  ninth: "$" + record.Marketcap,
                  tenth: record.Coingecko_Rank,
                  eleventh: (parseFloat(record.Liquidity_Locked) * parseFloat(record.Tokens_Locked/record.Token_TotalAmount) * parseFloat(record.Time_to_unlock)).toFixed(1)
                }
              ); 
            });
            return tokensInfo;
          },
        [records]
  );

  return <Actiontable columns={columns} data={data} pageNo={pageIndex} setPageIndex={(pageIndex) => setPageIndex(pageIndex)}/>;
}

export default Table;
