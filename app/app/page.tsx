import { Workspace } from "@/components/Workspace";

export const metadata = { title: "Nexa · Your ASEAN opportunities" };

export default async function AppPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const sp = await searchParams;
  return <Workspace autoSample={sp.sample === "1"} />;
}
