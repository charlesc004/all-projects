import { notFound } from "next/navigation";
import { Workspace } from "@/components/layout/workspace";
const sections = [
  "transactions",
  "alerts",
  "cases",
  "models",
  "policies",
  "analytics",
  "monitoring",
  "audit",
  "settings",
];
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <Workspace section={section} />;
}
