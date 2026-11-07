"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight, LogOut, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, setCSRF } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Wordmark, SentinelMark } from "@/components/ui/identity";
import { ErrorState, Skeleton } from "@/components/ui/shared";
import { Login } from "@/features/login";
import { NotificationsMenu } from "@/features/notifications";
import { DashboardScreen } from "@/features/dashboard";
import {
  TransactionsScreen,
  AlertsScreen,
  CasesScreen,
} from "@/features/records";
import {
  ModelsScreen,
  PoliciesScreen,
  AuditScreen,
  SettingsScreen,
  MonitoringScreen,
} from "@/features/management";
const navigation = [
  {
    id: "overview",
    label: "Overview",
    description: "The signals you need. The space to think.",
  },
  {
    id: "transactions",
    label: "Transactions",
    description: "Trace the event. Understand the assessment.",
  },
  {
    id: "alerts",
    label: "Fraud alerts",
    description: "Policy decisions waiting for human judgment.",
  },
  {
    id: "cases",
    label: "Investigations",
    description: "Follow the evidence. Document the decision.",
  },
  {
    id: "analytics",
    label: "Risk analytics",
    description: "Read the patterns behind the individual events.",
  },
  {
    id: "models",
    label: "Model center",
    description: "Inspect the intelligence behind every assessment.",
  },
  {
    id: "policies",
    label: "Risk policies",
    description: "Translate your judgment into consistent review rules.",
  },
  {
    id: "monitoring",
    label: "Live monitoring",
    description: "Observe the system. Recognize the shift.",
  },
  {
    id: "audit",
    label: "Audit history",
    description: "A record of who acted, what changed, and when.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "The people, permissions and preferences of your desk.",
  },
];
export function Workspace({ section }: { section: string }) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [scenario, setScenario] = useState("suspicious");
  useEffect(() => {
    const expire = () => {
      client.setQueryData(["session"], { user: null, csrf_token: "" });
      client.invalidateQueries({ queryKey: ["session"] });
    };
    window.addEventListener("sentinel:session-expired", expire);
    return () => window.removeEventListener("sentinel:session-expired", expire);
  }, [client]);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await api<{
        user: User | null;
        csrf_token: string;
        demo_enabled?: boolean;
      }>("/auth/session");
      setCSRF(result.csrf_token);
      return result;
    },
    retry: false,
  });
  if (session.isPending)
    return (
      <main className="boot">
        <SentinelMark />
        <Skeleton />
      </main>
    );
  if (session.error)
    return (
      <main className="boot">
        <ErrorState error={session.error} retry={() => session.refetch()} />
      </main>
    );
  if (!session.data.user)
    return (
      <Login
        demoEnabled={session.data.demo_enabled === true}
        onLogin={() => client.invalidateQueries({ queryKey: ["session"] })}
      />
    );
  const user = session.data.user;
  const current =
    navigation.find((item) => item.id === section) || navigation[9];
  return (
    <div className="desk-workspace">
      <a className="skip-link" href="#desk-main">
        Skip to content
      </a>
      <header className="desk-masthead">
        <Wordmark />
        <div className="desk-organization">
          <span className="micro-label">CONNECTED WORKSPACE</span>
          <strong>{user.organization.name}</strong>
        </div>
        <form action="/transactions" className="desk-search">
          <Search size={17} />
          <input
            aria-label="Global transaction search"
            name="q"
            placeholder="Find a transaction"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>↵</kbd>
        </form>
        <div className="desk-tools">
          <NotificationsMenu />

          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await api("/auth/logout", { method: "DELETE" });
                client.clear();
                window.location.reload();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <nav
        id="desk-navigation"
        aria-label="Workspace navigation"
        className="desk-navigation"
      >
        {navigation.map((item) => (
          <Link
            key={item.id}
            href={item.id === "overview" ? "/" : `/${item.id}`}
            aria-current={section === item.id ? "page" : undefined}
            className={section === item.id ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="desk-content" id="desk-main">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="desk-page-heading">
            <div>
              <span className="micro-label">
                {section === "overview"
                  ? "YOUR INTELLIGENCE, CONNECTED"
                  : `WORKSPACE / ${current.label.toUpperCase()}`}
              </span>
              <h1>
                {section === "overview"
                  ? "Perspective changes everything"
                  : current.label}
                <span className="title-period">.</span>
              </h1>
              <p>{current.description}</p>
            </div>
            {user.role !== "viewer" && (
              <div className="desk-demo">
                <span className="micro-label">EXERCISE THE PIPELINE</span>
                <div>
                  <select
                    aria-label="Sample scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  >
                    <option value="suspicious">Suspicious event</option>
                    <option value="normal">Normal event</option>
                  </select>
                  <Button
                    disabled={generating}
                    aria-label="Generate transaction"
                    onClick={async () => {
                      setGenerating(true);
                      try {
                        const result = await api<{ transaction_id: string }>(
                          "/demo/transactions",
                          {
                            method: "POST",
                            body: JSON.stringify({ scenario }),
                          },
                        );
                        toast.success(
                          `Transaction accepted: ${result.transaction_id.slice(0, 8)}`,
                          {
                            description:
                              "The event is moving through ingestion, inference and policy review.",
                          },
                        );
                        await client.invalidateQueries();
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setGenerating(false);
                      }
                    }}
                  >
                    {generating ? "Sending…" : "Send test event"}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
          {(section === "overview" || section === "analytics") && (
            <DashboardScreen analytics={section === "analytics"} />
          )}
          {section === "transactions" && <TransactionsScreen />}
          {section === "alerts" && <AlertsScreen user={user} />}
          {section === "cases" && <CasesScreen user={user} />}
          {section === "models" && <ModelsScreen user={user} />}
          {section === "policies" && <PoliciesScreen user={user} />}
          {section === "monitoring" && <MonitoringScreen />}
          {section === "audit" && <AuditScreen />}
          {section === "settings" && <SettingsScreen />}
        </motion.div>
        <footer className="desk-footer">
          <span>
            <SentinelMark size={19} />
            Machine intelligence. Human accountability.
          </span>
          <Link href="/api-reference">
            Platform reference <ArrowUpRight size={13} />
          </Link>
          <span>SentinelML / All times UTC</span>
        </footer>
      </main>
    </div>
  );
}
