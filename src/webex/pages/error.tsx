/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */


import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");

import * as wxApi from "../wxApi";

import { Collapsible } from "../renderHtml";

interface ErrorProps {
  report: any;
}

class ErrorView extends React.Component<ErrorProps, { }> {
  render(): JSX.Element {
    const report = this.props.report;
    if (!report) {
      return (
        <div id="main">
          <h1>Error Report Not Found</h1>
          <p>This page is supposed to display an error reported by the GNU Taler wallet,
              but the corresponding error report can't be found.</p>
          <p>Maybe the error occured before the browser was restarted or the wallet was reloaded.</p>
        </div>
      );
    }
    try {
      switch (report.name) {
        case "pay-post-failed": {
          const summary = report.contractTerms.summary || report.contractTerms.order_id;
          return (
            <div id="main">
              <h1>Failed to send payment</h1>
              <p>Failed to send payment for <strong>{summary}</strong> to merchant <strong>{report.contractTerms.merchant.name}</strong>.</p>
              <p>You can <a href={report.contractTerms.fulfillment_url}>retry</a> the payment.  If this problem persists,
                please contact the mechant with the error details below.</p>
              <Collapsible initiallyCollapsed={true} title="Error Details">
                <pre>
                  {JSON.stringify(report, null, " ")}
                </pre>
              </Collapsible>
            </div>
          );
        }
        default:
          return (
            <div id="main">
              <h1>Unknown Error</h1>
              The GNU Taler wallet reported an unknown error.  Here are the details:
              <pre>
                {JSON.stringify(report, null, " ")}
              </pre>
            </div>
          );
      }
    } catch (e) {
        return (
          <div id="main">
            <h1>Error</h1>
            The GNU Taler wallet reported an error.  Here are the details:
            <pre>
              {JSON.stringify(report, null, " ")}
            </pre>
            A detailed error report could not be generated:
            <pre>
              {e.toString()}
            </pre>
          </div>
        );
    }
  }
}

async function main() {
  const url = new URI(document.location.href);
  const query: any = URI.parseQuery(url.query());

  const container = document.getElementById("container");
  if (!container) {
    console.error("fatal: can't mount component, countainer missing");
    return;
  }

  // report that we'll render, either looked up from the
  // logging module or synthesized here for fixed/fatal errors
  let report;

  const reportUid: string = query.reportUid;
  if (!reportUid) {
    report = {
      name: "missing-error",
    };
  } else {
    report = await wxApi.getReport(reportUid);
  }

  ReactDOM.render(<ErrorView report={report} />, container);
}

document.addEventListener("DOMContentLoaded", () => main());
