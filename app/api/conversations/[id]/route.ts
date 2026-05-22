import db from "../../../../lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.query(`DELETE FROM sessions WHERE id = $1`, [id]);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[conversations] DELETE failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
