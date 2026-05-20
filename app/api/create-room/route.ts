import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { name, password, answers } = await req.json();
  // answers: string[]

  if (!name || !password) {
    return NextResponse.json(
      { error: "missing params" },
      { status: 400 }
    );
  }

  // 1. パスワードをハッシュ化
  const password_hash = await bcrypt.hash(password, 10);

  // 2. 部屋作成
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      name,
      password_hash,
    })
    .select()
    .single();

  // if (error) {
  //   return NextResponse.json({ error }, { status: 500 });
  // }
  //変更後：エラーの「メッセージ」をテキストとして返すようにする
if (error) {
  return NextResponse.json(
    { error: error.message || "Supabaseへの保存に失敗しました" }, 
    { status: 500 }
  );
}

  // 3. 正解リスト保存
  if (answers?.length > 0) {
    const rows = answers.map((a: string) => ({
      room_id: room.id,
      answer: a.trim(),
    }));

    await supabase.from("correct_answers").insert(rows);
  }

  return NextResponse.json({
    roomId: room.id,
  });
}