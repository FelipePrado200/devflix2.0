import { NextResponse } from "next/server";
import { getMovieDetails, TmdbMissingToken } from "@/lib/tmdb";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movieId = Number(id);
  if (!Number.isInteger(movieId) || movieId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(movieId);
    return NextResponse.json(movie, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    if (err instanceof TmdbMissingToken) {
      return NextResponse.json({ error: "TMDB_TOKEN ausente no servidor" }, { status: 503 });
    }
    return NextResponse.json({ error: "Não foi possível carregar o filme" }, { status: 502 });
  }
}
