import db from "../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows } = await db.query(
      `SELECT role, content
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("[messages] GET failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

// Clear all messages for a session (keeps session + inference_logs intact)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.query(`DELETE FROM messages WHERE session_id = $1`, [id]);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[messages] DELETE failed:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
