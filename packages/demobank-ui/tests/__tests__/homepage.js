import "core-js/stable";
import "regenerator-runtime/runtime";
import "@testing-library/jest-dom";
import { BankHome } from '../../src/pages/home';
import { h } from 'preact';
import { waitFor, cleanup, render, fireEvent, screen } from '@testing-library/preact';
import expect from 'expect';
import fetchMock from "jest-fetch-mock";

/**
 * This mock makes the translator always return the
 * english string.  It didn't work within the 'beforeAll'
 * function...
 */
jest.mock("../../src/i18n")
const i18n = require("../../src/i18n")
i18n.useTranslator.mockImplementation(() => function(arg) {return arg})

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    value: {
      origin: "http://localhost",
      pathname: "/demobanks/default"
    }
  })
  global.Storage.prototype.setItem = jest.fn((key, value) => {})
})

function fillCredentialsForm() {
  const username = Math.random().toString().substring(2);
  const u = screen.getByPlaceholderText("username");
  const p = screen.getByPlaceholderText("password");
  fireEvent.input(u, {target: {value: username}})
  fireEvent.input(p, {target: {value: "bar"}})
  const signinButton = screen.getByText("Login");
  return {
    username: username,
    signinButton: signinButton
  };
}
fetchMock.enableMocks();

function mockSuccessLoginOrRegistration() {
  fetch.once("{}", {
    status: 200
  }).once(JSON.stringify({
    balance: {
      amount: "EUR:10",
      credit_debit_indicator: "credit"
    },
    paytoUri: "payto://iban/123/ABC"
  }))
}

/**
 * Render homepage -> navigate to register page -> submit registration.
 * 'webMock' is called before submission to mock the server response
 */
function signUp(context, webMock) {
  render(<BankHome />);
  const registerPage = screen.getByText("Register!");
  fireEvent.click(registerPage);
  const username = Math.random().toString().substring(2);
  const u = screen.getByPlaceholderText("username");
  const p = screen.getByPlaceholderText("password");
  fireEvent.input(u, {target: {value: username}})
  fireEvent.input(p, {target: {value: "bar"}})
  const registerButton = screen.getByText("Register");
  webMock();
  fireEvent.click(registerButton);
  context.username = username;
  return context;
}

describe("wire transfer", () => {
  beforeEach(() => {
    signUp({}, mockSuccessLoginOrRegistration); // context unused
  })
  test("Wire transfer success", async () => {
    const transferButton = screen.getByText("Create wire transfer");
    const payto = screen.getByPlaceholderText("payto address");
    fireEvent.input(payto, {target: {value: "payto://only-checked-by-the-backend!"}})
    fetch.once("{}"); // 200 OK
    fireEvent.click(transferButton);
    await screen.findByText("wire transfer created", {exact: false})
  })
  test("Wire transfer fail", async () => {
    const transferButton = screen.getByText("Create wire transfer");
    const payto = screen.getByPlaceholderText("payto address");
    fireEvent.input(payto, {target: {value: "payto://only-checked-by-the-backend!"}})
    fetch.once("{}", {status: 400});
    fireEvent.click(transferButton);
    // assert this below does NOT appear.
    await waitFor(() => expect(
      screen.queryByText("wire transfer created", {exact: false})).not.toBeInTheDocument());
  })
})

describe("withdraw", () => {
  afterEach(() => {
    fetch.resetMocks();
    cleanup();
  })


  let context = {};
  // Register and land on the profile page.
  beforeEach(() => {
    context = signUp(context, mockSuccessLoginOrRegistration); 
  })

  test("network failure before withdrawal creation", async () => {
    const a = screen.getAllByPlaceholderText("amount")[0];
    fireEvent.input(a, {target: {value: "10"}});
    let withdrawButton = screen.getByText("Charge Taler wallet");
    // mock network failure.
    fetch.mockReject("API is down");
    fireEvent.click(withdrawButton);
    await screen.findByText("could not create withdrawal operation", {exact: false})
  })

  test("HTTP response error upon withdrawal creation", async () => {
    const a = screen.getAllByPlaceholderText("amount")[0];
    fireEvent.input(a, {target: {value: "10,0"}});
    let withdrawButton = screen.getByText("Charge Taler wallet");
    fetch.once("{}", {status: 404});
    fireEvent.click(withdrawButton);
    await screen.findByText("gave response error", {exact: false})
  })

  test("Abort withdrawal", async () => {
    const a = screen.getAllByPlaceholderText("amount")[0];
    fireEvent.input(a, {target: {value: "10,0"}});
    let withdrawButton = screen.getByText("Charge Taler wallet");
    fetch.once(JSON.stringify({
      taler_withdraw_uri: "taler://withdraw/foo",
      withdrawal_id: "foo"
    }));
    /**
     * After triggering a withdrawal, check if the taler://withdraw URI
     * rendered, and confirm if so.  Lastly, check that a success message
     * appeared on the screen.
     */
    fireEvent.click(withdrawButton);
    const abortButton = await screen.findByText("abort withdrawal", {exact: false})
    fireEvent.click(abortButton);
    expect(fetch).toHaveBeenLastCalledWith(
    `http://localhost/demobanks/default/access-api/accounts/${context.username}/withdrawals/foo/abort`,
    expect.anything()
    )
    await waitFor(() => expect(
      screen.queryByText("abort withdrawal", {exact: false})).not.toBeInTheDocument());
  })

  test("Successful withdrawal creation and confirmation", async () => {
    const a = screen.getAllByPlaceholderText("amount")[0];
    fireEvent.input(a, {target: {value: "10,0"}});
    let withdrawButton = await screen.findByText("Charge Taler wallet");
    fetch.once(JSON.stringify({
      taler_withdraw_uri: "taler://withdraw/foo",
      withdrawal_id: "foo"
    }));
    /**
     * After triggering a withdrawal, check if the taler://withdraw URI
     * rendered, and confirm if so.  Lastly, check that a success message
     * appeared on the screen.  */
    fireEvent.click(withdrawButton);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost/demobanks/default/access-api/accounts/${context.username}/withdrawals`,
      expect.objectContaining({body: JSON.stringify({amount: "EUR:10.0"})})
    )
    // assume wallet POSTed the payment details.
    const confirmButton = await screen.findByText("confirm withdrawal", {exact: false})
    /**
     * Not expecting a new withdrawal possibility while one is being processed.
     */
    await waitFor(() => expect(
      screen.queryByText("charge taler wallet", {exact: false})).not.toBeInTheDocument());
    fetch.once("{}")
    // Confirm currently processed withdrawal.
    fireEvent.click(confirmButton);
    /**
     * After having confirmed above, wait that the
     * pre-withdrawal elements disappears and a success
     * message appears.
     */
    await waitFor(() => expect(
      screen.queryByText(
        "confirm withdrawal",
	{exact: false})).not.toBeInTheDocument()
    );
    await waitFor(() => expect(
      screen.queryByText(
        "give this address to the taler wallet",
        {exact: false})).not.toBeInTheDocument()
    );
    expect(fetch).toHaveBeenLastCalledWith(
    `http://localhost/demobanks/default/access-api/accounts/${context.username}/withdrawals/foo/confirm`,
    expect.anything())
    // success message
    await screen.findByText("withdrawal confirmed", {exact: false})

    /**
     * Click on a "return to homepage / close" button, and
     * check that the withdrawal confirmation is gone, and
     * the option to withdraw again reappeared.
     */
    const closeButton = await screen.findByText("close", {exact: false})
    fireEvent.click(closeButton);

    /**
     * After closing the operation, the confirmation message is not expected.
     */
    await waitFor(() => expect(
      screen.queryByText("withdrawal confirmed", {exact: false})).not.toBeInTheDocument()
    );

    /**
     * After closing the operation, the possibility to withdraw again should be offered.
     */
    await waitFor(() => expect(
      screen.queryByText(
        "charge taler wallet",
        {exact: false})).toBeInTheDocument()
    );
  })
})

describe("home page", () => {
  afterEach(() => {
    fetch.resetMocks();
    cleanup();
  })
  test("public histories", async () => {
    render(<BankHome />);
    /**
     * Mock list of public accounts.  'bar' is
     * the shown account, since it occupies the last
     * position (and SPA picks it via the 'pop()' method) */
    fetch.once(JSON.stringify({
      "publicAccounts" : [ {
        "balance" : "EUR:1",
        "iban" : "XXX",
        "accountLabel" : "foo"
      }, {
        "balance" : "EUR:2",
        "iban" : "YYY",
        "accountLabel" : "bar"
      }]
    })).once(JSON.stringify({
      transactions: [{
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "DBIT",
        amount: "EUR:5",
	subject: "Reimbursement",
	date: "1970-01-01"
      }, {
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "CRDT",
        amount: "EUR:5",
	subject: "Bonus",
	date: "2000-01-01"
      }]
    })).once(JSON.stringify({ 
      transactions: [{
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "DBIT",
        amount: "EUR:5",
	subject: "Donation",
	date: "1970-01-01"
      }, {
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "CRDT",
        amount: "EUR:5",
	subject: "Refund",
	date: "2000-01-01"
      }]
    }))

    // Navigate to dedicate public histories page.
    const publicTxsPage = screen.getByText("transactions");
    fireEvent.click(publicTxsPage);

    /**
     * Check that transactions data appears on the page.
     */
    await screen.findByText("reimbursement", {exact: false});
    await screen.findByText("bonus", {exact: false});
    /**
     * The transactions below should not appear, because only
     * one public account renders.
     */
    await waitFor(() => expect(
      screen.queryByText("refund", {exact: false})).not.toBeInTheDocument());
    await waitFor(() => expect(
      screen.queryByText("donation", {exact: false})).not.toBeInTheDocument());
    /**
     * First HTTP mock:
     */
    await expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/public-accounts"
    )
    /**
     * Only expecting this request (second mock), as SWR doesn't let
     * the unshown history request to the backend:
     */
    await expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/accounts/bar/transactions?page=0"
    )
    /**
     * Switch tab:
     */
    let fooTab = await screen.findByText("foo", {exact: false});
    fireEvent.click(fooTab);
    /**
     * Last two HTTP mocks should render now:
     */
    await screen.findByText("refund", {exact: false});
    await screen.findByText("donation", {exact: false});

    // Expect SWR to have requested 'foo' history
    // (consuming the last HTTP mock):
    await expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/accounts/foo/transactions?page=0"
    )
    let backButton = await screen.findByText("Go back", {exact: false});
    fireEvent.click(backButton);
    await waitFor(() => expect(
      screen.queryByText("donation", {exact: false})).not.toBeInTheDocument());
    await screen.findByText("welcome to eufin bank", {exact: false})
  })

  // check page informs about the current balance
  // after a successful registration.

  test("new registration response error 404", async () => {
    var context = signUp({}, () => fetch.mockResponseOnce("Not found", {status: 404}));
    await screen.findByText("has a problem", {exact: false});
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/testing/register",
      expect.objectContaining(
        {body: JSON.stringify({username: context.username, password: "bar"}), method: "POST"},
    ))
  })

  test("registration network failure", async () => {
    let context = signUp({}, ()=>fetch.mockReject("API is down"));
    await screen.findByText("has a problem", {exact: false});
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/testing/register",
      expect.objectContaining(
        {body: JSON.stringify({username: context.username, password: "bar"}), method: "POST"}
      ))
  })
  
  test("login non existent user", async () => {
    render(<BankHome />);
    const { username, signinButton } = fillCredentialsForm();
    fetch.once("{}", {status: 404});
    fireEvent.click(signinButton);
    await screen.findByText("username or account label not found", {exact: false})
  })
  test("login wrong credentials", async () => {
    render(<BankHome />);
    const { username, signinButton } = fillCredentialsForm();
    fetch.once("{}", {status: 401});
    fireEvent.click(signinButton);
    await screen.findByText("wrong credentials given", {exact: false})
  })

  /**
   * Test that balance and last transactions get shown
   * after a successful login.
   */
  test("login success", async () => {
    render(<BankHome />);
    const { username, signinButton } = fillCredentialsForm();
    
    // Response to balance request.
    fetch.once(JSON.stringify({
      balance: {
        amount: "EUR:10",
	credit_debit_indicator: "credit"
      },
      paytoUri: "payto://iban/123/ABC"
    })).once(JSON.stringify({ // Response to history request.
      transactions: [{
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "DBIT",
        amount: "EUR:5",
	subject: "Donation",
	date: "01-01-1970"
      }, {
        debtorIban: "XXX",
        debtorBic: "YYY",
        debtorName: "Foo",
        creditorIban: "AAA",
        creditorBic: "BBB",
        creditorName: "Bar",
	direction: "CRDT",
        amount: "EUR:5",
	subject: "Refund",
	date: "01-01-2000"
      }]
    }))
    fireEvent.click(signinButton);
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost/demobanks/default/access-api/accounts/${username}`,
      expect.anything()
    )
    await screen.findByText("balance is 10 EUR", {exact: false})
    // The two transactions in the history mocked above.
    await screen.findByText("refund", {exact: false})
    await screen.findByText("donation", {exact: false})
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost/demobanks/default/access-api/accounts/${username}/transactions?page=0`,
      expect.anything()
    )
  })

  test("registration success", async () => {
    let context = signUp({}, mockSuccessLoginOrRegistration);
    /**
     * Tests that a balance is shown after the successful
     * registration.
     */
    await screen.findByText("balance is 10 EUR", {exact: false})
    /**
     * The expectation below tests whether the account
     * balance was requested after the successful registration.
     */
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/demobanks/default/access-api/testing/register",
      expect.anything() // no need to match auth headers.
    )
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost/demobanks/default/access-api/accounts/${context.username}`,
      expect.anything() // no need to match auth headers.
    )
  })
})
