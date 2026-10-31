import { EventDashboard } from "@/components/events/EventDashboard";

export const metadata = { title: "Nexa · Event dashboard" };

export default async function LivePage({ params }: PageProps<"/events/[id]/live">) {
  const { id } = await params;
  return <EventDashboard id={id} />;
}
