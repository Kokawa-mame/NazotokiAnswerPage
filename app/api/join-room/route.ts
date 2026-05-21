import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { roomId, password, username } = await req.json();

  if (!roomId || !password || !username) {
    return NextResponse.json(
      { error: "missing params" },
      { status: 400 }
    );
  }

  // 1. 部屋取得
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) {
    return NextResponse.json(
      { error: "room not found" },
      { status: 404 }
    );
  }

  // パスワード検証（修正点）
  // 平文同士を直接「===」で比較します。
  const ok = password === room.password; 

  if (!ok) {
    return NextResponse.json(
      { error: "wrong password" },
      { status: 403 }
    );
  }

  // 3. 参加者登録
  const { error } = await supabase.from("room_members").insert({
    room_id: roomId,
    username,
    is_online: true,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
  });
}