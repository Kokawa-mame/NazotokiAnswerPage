import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 💡 ランダムな6桁の英数字を生成する関数（見づらい O, 0, I, 1 を排除）
function generateShortRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  const { name, password, answers } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // 6桁のクイズ用コードを生成
  const shortRoomId = generateShortRoomId();

  // 1. 部屋作成（従来のidは自動生成させ、新カラムroom_idに6桁を保存）
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      room_id: shortRoomId, // ここに6桁コードを保存！
      name,
      password,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Supabaseへの保存に失敗しました" }, 
      { status: 500 }
    );
  }

  // 2. 正解リスト保存
  if (answers?.length > 0) {
    const rows = answers.map((a: string) => ({
      room_id: room.id, // 内部的なリレーション（紐付け）は確実なUUID（room.id）をそのまま使用
      answer: a.trim(),
    }));

    await supabase.from("correct_answers").insert(rows);
  }

  return NextResponse.json({
    // フロント（画面）には、URLの遷移用として確実なUUID（room.id）を返します
    roomId: room.id, 
  });
}