
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Bot,
  LogOut,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  AlertTriangle,
  Send,
  X,
  Menu,
  CreditCard,
  ShieldCheck,
  Activity,
} from "lucide-react";

type Page =
  | "Dashboard"
  | "Accounts"
  | "Transactions"
  | "Analytics"
  | "AI Assistant";

type Account = {
  id: string;
  account_name: string;
  account_type: string;
  institution_name?: string;
  balance: number;
  currency: string;
};

type Transaction = {
  id: string;
  account_id?: string;
  transaction_type: string;
  category: string;
  description?: string;
  amount: number;
  transaction_date?: string;
};

type Analytics = {
  total_balance?: number;
  total_income?: number;
  total_expenses?: number;
  net_cash_flow?: number;
  recent_transactions?: Transaction[];
  expense_categories?: { category: string; total: number }[];
};

type Risk = {
  risk: string;
  severity: string;
  message: string;
};

type User = {
  full_name?: string;
  email?: string;
};

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateText = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || `Request failed (${response.status})`
    );
  }

  return data as T;
}

export default function DashboardPage() {
  const router = useRouter();

  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [user, setUser] = useState<User>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("savings");
  const [institution, setInstitution] = useState("");
  const [accountBalance, setAccountBalance] = useState("");

  const [transactionType, setTransactionType] = useState("expense");
  const [transactionAccount, setTransactionAccount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const profile = await api<User>("/api/auth/me");
      setUser(profile);

      const results = await Promise.allSettled([
        api<Analytics>("/api/dashboard/analytics"),
        api<Account[]>("/api/accounts"),
        api<Transaction[]>("/api/transactions"),
        api<{ risks?: Risk[] }>("/api/ai/risk-analysis"),
      ]);

      if (results[0].status === "fulfilled") {
        setAnalytics(results[0].value);
      }

      if (results[1].status === "fulfilled") {
        setAccounts(Array.isArray(results[1].value) ? results[1].value : []);
      }

      if (results[2].status === "fulfilled") {
        setTransactions(
          Array.isArray(results[2].value) ? results[2].value : []
        );
      }

      if (results[3].status === "fulfilled") {
        setRisks(results[3].value.risks || []);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load dashboard.";

      if (
        message.toLowerCase().includes("auth") ||
        message.includes("401")
      ) {
        router.push("/login");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await api("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          account_name: accountName,
          account_type: accountType,
          institution_name: institution || null,
          balance: Number(accountBalance || 0),
          currency: "INR",
        }),
      });

      setShowAccountForm(false);
      setAccountName("");
      setInstitution("");
      setAccountBalance("");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to add account.");
    }
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          account_id: transactionAccount,
          transaction_type: transactionType,
          category: transactionCategory,
          description: transactionDescription || null,
          amount: Number(transactionAmount),
        }),
      });

      setShowTransactionForm(false);
      setTransactionCategory("");
      setTransactionDescription("");
      setTransactionAmount("");
      await loadData();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Unable to add transaction."
      );
    }
  }

  async function askAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    setAiLoading(true);
    setAnswer("");

    try {
      const result = await api<{ answer: string }>(
        "/api/ai/financial-assistant",
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      );

      setAnswer(result.answer || "No answer was returned.");
    } catch (err) {
      setAnswer(
        err instanceof Error ? err.message : "Unable to contact AI assistant."
      );
    } finally {
      setAiLoading(false);
    }
  }

  const navItems: {
    name: Page;
    icon: typeof LayoutDashboard;
  }[] = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Transactions", icon: ArrowLeftRight },
    { name: "Accounts", icon: Wallet },
    { name: "Analytics", icon: BarChart3 },
    { name: "AI Assistant", icon: Bot },
  ];

  const recentTransactions =
    transactions.length > 0
      ? transactions.slice(0, 6)
      : analytics.recent_transactions || [];

  const firstName = user.full_name?.split(" ")[0] || "User";

  return (
    <div className="min-h-screen bg-[#080d1a] text-white">
      <div className="flex min-h-screen">
        {mobileMenu && (
          <button
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0d1425] transition-transform lg:static lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <IndianRupee size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PayPilot</h1>
              <p className="text-xs text-violet-300">AI Finance Platform</p>
            </div>
          </div>

          <div className="px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Workspace
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const selected = activePage === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActivePage(item.name);
                      setMobileMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      selected
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={19} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-white/10 p-4">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-bold">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user.full_name || "PayPilot User"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user.email || "Personal Account"}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#080d1a]/95 px-5 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
                onClick={() => setMobileMenu(true)}
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
              <div>
                <h2 className="text-lg font-bold">{activePage}</h2>
                <p className="hidden text-xs text-slate-400 sm:block">
                  Welcome back, {firstName}
                </p>
              </div>
            </div>

            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-white/10 bg-[#111a2d] p-5 text-sm text-slate-400">
                Loading your financial information...
              </div>
            )}

            {!loading && activePage === "Dashboard" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold md:text-3xl">
                      Financial Overview
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                      Track your money and make smarter decisions.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTransactionForm(true)}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-900/30 hover:bg-violet-500"
                  >
                    <Plus size={18} />
                    Add Transaction
                  </button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Total Balance"
                    value={money(analytics.total_balance)}
                    icon={Wallet}
                    color="violet"
                  />
                  <StatCard
                    title="Total Income"
                    value={money(analytics.total_income)}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatCard
                    title="Total Expenses"
                    value={money(analytics.total_expenses)}
                    icon={TrendingDown}
                    color="red"
                  />
                  <StatCard
                    title="Net Cash Flow"
                    value={money(analytics.net_cash_flow)}
                    icon={Activity}
                    color="blue"
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <section className="rounded-2xl border border-white/10 bg-[#111a2d] p-6 xl:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">Recent Transactions</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Your latest financial activity
                        </p>
                      </div>
                      <button
                        onClick={() => setActivePage("Transactions")}
                        className="text-xs font-semibold text-violet-400 hover:text-violet-300"
                      >
                        View all
                      </button>
                    </div>
                    <TransactionTable items={recentTransactions} />
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-[#111a2d] p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <ShieldCheck className="text-violet-400" size={20} />
                      <h3 className="font-bold">Financial Risk Analysis</h3>
                    </div>

                    {risks.length === 0 ? (
                      <div className="rounded-xl bg-emerald-500/10 p-4">
                        <p className="text-sm font-semibold text-emerald-400">
                          No risks detected
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          No financial warnings were returned by the analysis.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {risks.map((risk, index) => (
                          <div
                            key={`${risk.risk}-${index}`}
                            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <AlertTriangle
                                size={16}
                                className="text-amber-400"
                              />
                              <p className="text-sm font-semibold">
                                {risk.risk}
                              </p>
                            </div>
                            <p className="text-xs leading-5 text-slate-400">
                              {risk.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setActivePage("AI Assistant")}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-3 text-sm font-semibold text-violet-300 hover:bg-violet-500/20"
                    >
                      <Bot size={17} />
                      Ask PayPilot AI
                    </button>
                  </section>
                </div>

                <section className="rounded-2xl border border-white/10 bg-[#111a2d] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">My Accounts</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Your connected financial accounts
                      </p>
                    </div>
                    <button
                      onClick={() => setActivePage("Accounts")}
                      className="text-xs font-semibold text-violet-400"
                    >
                      View accounts
                    </button>
                  </div>
                  <AccountGrid accounts={accounts.slice(0, 3)} />
                </section>
              </>
            )}

            {!loading && activePage === "Accounts" && (
              <>
                <PageHeading
                  title="My Accounts"
                  subtitle="Manage your financial accounts."
                  buttonText="Add Account"
                  onClick={() => setShowAccountForm(true)}
                />
                <AccountGrid accounts={accounts} />
              </>
            )}

            {!loading && activePage === "Transactions" && (
              <>
                <PageHeading
                  title="Transactions"
                  subtitle="View and manage your income and expenses."
                  buttonText="Add Transaction"
                  onClick={() => setShowTransactionForm(true)}
                />
                <section className="rounded-2xl border border-white/10 bg-[#111a2d] p-5 md:p-6">
                  <TransactionTable items={transactions} />
                </section>
              </>
            )}

            {!loading && activePage === "Analytics" && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Financial Analytics</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Understand your income and spending.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <StatCard
                    title="Income"
                    value={money(analytics.total_income)}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatCard
                    title="Expenses"
                    value={money(analytics.total_expenses)}
                    icon={TrendingDown}
                    color="red"
                  />
                  <StatCard
                    title="Cash Flow"
                    value={money(analytics.net_cash_flow)}
                    icon={BarChart3}
                    color="violet"
                  />
                </div>

                <section className="rounded-2xl border border-white/10 bg-[#111a2d] p-6">
                  <h3 className="mb-5 font-bold">Expense Categories</h3>
                  {(analytics.expense_categories || []).length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No expense category data available yet.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {analytics.expense_categories?.map((item) => {
                        const total = Number(item.total) || 0;
                        const max = Math.max(
                          ...(analytics.expense_categories || []).map(
                            (entry) => Number(entry.total) || 0
                          ),
                          1
                        );
                        const percent = Math.min((total / max) * 100, 100);

                        return (
                          <div key={item.category}>
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="text-slate-300">
                                {item.category}
                              </span>
                              <span className="font-semibold">
                                {money(total)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {!loading && activePage === "AI Assistant" && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">PayPilot AI Assistant</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Ask questions about your recorded financial activity.
                  </p>
                </div>

                <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#111a2d] p-6 md:p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
                      <Bot size={30} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Financial Assistant</h3>
                      <p className="text-xs text-emerald-400">
                        Ready to help
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 rounded-xl border border-white/10 bg-[#080d1a] p-5">
                    <p className="text-sm leading-7 text-slate-300">
                      Hello! I can help you understand your income, expenses,
                      spending categories, and financial activity. What would
                      you like to know?
                    </p>
                  </div>

                  {answer && (
                    <div className="mb-5 rounded-xl border border-violet-500/20 bg-violet-500/10 p-5">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                        PayPilot AI Response
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                        {answer}
                      </p>
                    </div>
                  )}

                  <form onSubmit={askAI} className="space-y-3">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Example: What is my highest expense category?"
                      required
                      minLength={2}
                      maxLength={500}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#080d1a] p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !question.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      {aiLoading ? "Thinking..." : "Ask AI"}
                    </button>
                  </form>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {showAccountForm && (
        <Modal
          title="Add Financial Account"
          onClose={() => setShowAccountForm(false)}
        >
          <form onSubmit={addAccount} className="space-y-4">
            <Field
              label="Account Name"
              value={accountName}
              onChange={setAccountName}
              placeholder="My Savings"
              required
            />
            <label className="block text-sm text-slate-300">
              Account Type
              <select
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d1a] p-3 text-white outline-none focus:border-violet-500"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </label>
            <Field
              label="Bank / Institution"
              value={institution}
              onChange={setInstitution}
              placeholder="Bank name"
            />
            <Field
              label="Opening Balance (INR)"
              value={accountBalance}
              onChange={setAccountBalance}
              placeholder="5000"
              type="number"
              min="0"
            />
            <button className="w-full rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500">
              Save Account
            </button>
          </form>
        </Modal>
      )}

      {showTransactionForm && (
        <Modal
          title="Add Transaction"
          onClose={() => setShowTransactionForm(false)}
        >
          <form onSubmit={addTransaction} className="space-y-4">
            <label className="block text-sm text-slate-300">
              Account
              <select
                value={transactionAccount}
                onChange={(event) => setTransactionAccount(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d1a] p-3 text-white outline-none focus:border-violet-500"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              Transaction Type
              <select
                value={transactionType}
                onChange={(event) => setTransactionType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d1a] p-3 text-white outline-none focus:border-violet-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <Field
              label="Category"
              value={transactionCategory}
              onChange={setTransactionCategory}
              placeholder="Food, Salary, Rent..."
              required
            />
            <Field
              label="Description"
              value={transactionDescription}
              onChange={setTransactionDescription}
              placeholder="Transaction description"
            />
            <Field
              label="Amount (INR)"
              value={transactionAmount}
              onChange={setTransactionAmount}
              placeholder="500"
              type="number"
              min="0.01"
              required
            />

            <button
              disabled={accounts.length === 0}
              className="w-full rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              Save Transaction
            </button>

            {accounts.length === 0 && (
              <p className="text-xs text-amber-400">
                Add a financial account before adding a transaction.
              </p>
            )}
          </form>
        </Modal>
      )}

      <footer className="border-t border-white/10 px-5 py-4 text-center text-xs text-slate-600">
        PayPilot AI · Personal Finance Platform
      </footer>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: typeof Wallet;
  color: string;
}) {
  const colors: Record<string, string> = {
    violet: "bg-violet-500/15 text-violet-400",
    green: "bg-emerald-500/15 text-emerald-400",
    red: "bg-rose-500/15 text-rose-400",
    blue: "bg-sky-500/15 text-sky-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111a2d] p-5 transition hover:border-violet-500/30">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}
        >
          <Icon size={20} />
        </div>
      </div>
      <p className="break-words text-xl font-bold md:text-2xl">{value}</p>
    </div>
  );
}

function PageHeading({
  title,
  subtitle,
  buttonText,
  onClick,
}: {
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500"
      >
        <Plus size={18} />
        {buttonText}
      </button>
    </div>
  );
}

function AccountGrid({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
        <CreditCard className="mx-auto mb-3 text-slate-500" size={30} />
        <p className="text-sm font-semibold text-slate-300">
          No accounts added yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Add an account to start tracking your finances.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="rounded-xl border border-white/10 bg-[#0b1222] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <Wallet size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              Connected
            </span>
          </div>
          <h3 className="font-semibold">{account.account_name}</h3>
          <p className="mt-1 text-xs capitalize text-slate-400">
            {account.institution_name || account.account_type}
          </p>
          <p className="mt-4 text-xl font-bold">
            {money(account.balance)}
          </p>
        </div>
      ))}
    </div>
  );
}

function TransactionTable({ items }: { items: Transaction[] }) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <ArrowLeftRight className="mx-auto mb-3 text-slate-500" size={30} />
        <p className="text-sm text-slate-300">No transactions found</p>
        <p className="mt-1 text-xs text-slate-500">
          Your transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs text-slate-500">
            <th className="pb-4 font-medium">Category</th>
            <th className="pb-4 font-medium">Description</th>
            <th className="pb-4 font-medium">Date</th>
            <th className="pb-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const income =
              item.transaction_type?.toLowerCase() === "income";

            return (
              <tr
                key={item.id}
                className="border-b border-white/5 last:border-0"
              >
                <td className="py-4">
                  <span className="font-medium text-slate-200">
                    {item.category}
                  </span>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {item.transaction_type}
                  </p>
                </td>
                <td className="max-w-[180px] truncate py-4 text-slate-400">
                  {item.description || "—"}
                </td>
                <td className="py-4 text-slate-400">
                  {dateText(item.transaction_date)}
                </td>
                <td
                  className={`py-4 text-right font-semibold ${
                    income ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {income ? "+" : "-"}
                  {money(item.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111a2d] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={type === "number" ? "0.01" : undefined}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#080d1a] p-3 text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
      />
    </label>
  );
}
