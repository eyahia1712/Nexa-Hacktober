import { EventPage } from "@/components/events/EventPage";

export const metadata = { title: "Nexa · Event" };

export default async function EventRoute({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  return <EventPage id={id} />;
}
