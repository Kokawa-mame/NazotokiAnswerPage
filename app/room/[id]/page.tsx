"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RoomPage() {
  const { id } = useParams(); // id = URLの末尾（ご希望通り「長〜いUUID」が入ります）
  const searchParams = useSearchParams();

  const username = searchParams.get("name") || "anonymous";

  const [roomName, setRoomName] = useState<string>("読み込み中...");
  const [displayRoomId, setDisplayRoomId] = useState<string>("------"); // 💡 画面表示＆コピー用に6桁コードを保管する状態
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 連打・多重送信防止用

  // 💡 画面上の見栄えに合わせて「6桁コード」をクリップボードにコピーする関数
  const handleCopyId = async () => {
    if (!displayRoomId || displayRoomId === "------") return;
    try {
      await navigator.clipboard.writeText(displayRoomId); // 6桁コードをコピー
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  // 💡 画面起動時に、URLの「長いUUID」を使って部屋情報を取得する
  useEffect(() => {
    if (!id) return;
    const fetchRoomInfo = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("name, room_id") // 💡 ルーム名と6桁のroom_idを取得
        .eq("id", id) // ⭐ URLにある「長いUUID」でレコードを特定する（これで型エラーは起きません！）
        .single();

      if (error) {
        console.error("ルーム情報の取得失敗:", error);
        setRoomName("エラー: ルームが見つかりません");
        return;
      }

      if (data) {
        setRoomName(data.name);
        setDisplayRoomId(data.room_id || "------"); // 画面表示用に6桁コードをセット
      }
    };
    fetchRoomInfo();
  }, [id]);

  const send = async () => {
    if (!text.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Supabaseから正解リストを取得（長いUUIDで確実に絞り込む）
      const { data: correctAnswers, error: fetchError } = await supabase
        .from("correct_answers")
        .select("answer")
        .eq("room_id", id); // 内部リレーションのUUID（id）で検索

      if (fetchError) {
        console.error("正解データのフェッチエラー:", fetchError);
        alert(`正解データの取得に失敗しました: ${fetchError.message}`);
        return;
      }

      const answerList = correctAnswers?.map((item) => item.answer) || [];
      const isCorrect = answerList.includes(text.trim());

      // 判定結果（isCorrect）を含めてメッセージを保存
      const { error: insertError } = await supabase.from("messages").insert({
        room_id: id, // 内部ID（UUID）をそのまま保存
        username,
        text: text.trim(),
        is_correct: isCorrect,
      });

      if (insertError) {
        console.error("メッセージ保存エラー:", insertError);
        alert(`回答の送信に失敗しました: ${insertError.message}`);
        return;
      }

      // 画面に結果を表示
      setResult(isCorrect ? "正解！" : "不正解...");
      setText("");
    } catch (err) {
      console.error(err);
      alert("送信中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // エンターキーでも送信できるようにする関数
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      send();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-6">
        
        {/* 👑 ヘッダーエリア */}
        <header className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">参加中のルーム</p>
            </div>
            <h1 className="text-xl font-black text-slate-900 truncate">{roomName}</h1>
          </div>

          {/* ルームIDコピー部分（画面のURLは長いUUIDのまま、ここには6桁の短いコードを表示） */}
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="font-mono text-xs">
              <span className="text-slate-400 mr-1.5 select-none">ROOM ID:</span>
              <span className="font-bold text-slate-700 tracking-wider text-sm">{displayRoomId}</span>
            </div>
            <button
              onClick={handleCopyId}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95 whitespace-nowrap ${
                copied 
                  ? "bg-emerald-500 text-white shadow-sm" 
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 shadow-sm"
              }`}
            >
              {copied ? "✓ 完了" : "📋 コピー"}
            </button>
          </div>

          {/* 👤 プレイヤー名表示 */}
          <div className="text-xs text-slate-500 pl-1 font-semibold flex items-center gap-1">
            <span>あなた:</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{username}</span>
          </div>
        </header>

        {/* 📝 クイズ回答カード */}
        <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider pl-1">
              回答を入力
            </label>
            
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ここに答えを入力"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all text-base"
                disabled={isSubmitting}
              />
              
              <button 
                onClick={send}
                disabled={isSubmitting || !text.trim()}
                className={`w-full py-3.5 rounded-xl font-black text-base shadow-sm transition-all duration-150 active:scale-[0.98] ${
                  !text.trim() || isSubmitting
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
                }`}
              >
                {isSubmitting ? "判定中..." : "回答を送信する"}
              </button>
            </div>
          </div>

          {/* 🎯 正誤判定エリア */}
          {result && (
            <div className={`mt-4 rounded-xl p-4 border text-center transition-all animate-fade-in ${
              result === "正解！"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">直前の結果</p>
              <p className="text-2xl font-black tracking-wide">
                {result === "正解！" ? "🎉 正解！" : "👻 不正解..."}
              </p>
            </div>
          )}
        </main>

      </div>
      
      <footer className="text-center text-[10px] text-slate-400 font-semibold py-4">
        Nazotoki Answer Site 2026 Created by mamemema
      </footer>
    </div>
  );
}