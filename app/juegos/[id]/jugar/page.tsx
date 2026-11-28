import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAMES, getGame } from "@/lib/games";

// See app/juegos/[id]/page.tsx: blocking on params keeps the unknown-id 404 status.
export const instant = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  if (!getGame(id)) notFound();

  return <GamePlayer gameId={id} />;
}
