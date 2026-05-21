import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // 💡 プレイヤーが画面から入力してきた6桁の文字列（例: X77A9B）
  const { roomId, password, username } = await req.json();

  if (!roomId || !password || !username) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // 1. 部屋取得
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_id", roomId) // 修正点：従来の「id」ではなく、6桁が保管されている「room_id」で探す！
    .single();

  if (!room) {
    return NextResponse.json({ error: "room not found" }, { status: 404 });
  }

  // 2. パスワード検証（平文の文字列チェック）
  const ok = password === room.password; 

  if (!ok) {
    return NextResponse.json({ error: "wrong password" }, { status: 403 });
  }

  // 3. 参加者登録
  const { error } = await supabase.from("room_members").insert({
    room_id: room.id, // ここも内部的な紐付けなので、見つかった部屋の本来のUUID（room.id）を渡せばOK
    username,
    is_online: true,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    // フロント側がこの後「/room/[id]」へ移動できるように、本来の部屋のUUIDを返してあげます
    actualRoomId: room.id, 
  });
}