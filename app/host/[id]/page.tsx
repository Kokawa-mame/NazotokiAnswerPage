"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HostPage() {
  const { id } = useParams(); // id = 裏側の長〜いUUID
  const [roomName, setRoomName] = useState<string>("読み込み中...");
  const [displayRoomId, setDisplayRoomId] = useState<string>("------"); // 💡 6桁の短いルームIDを保存する状態
  const [roomPassword, setRoomPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // 💡 ルームID（6桁）をクリップボードにコピーする関数
  const handleCopyId = async () => {
    if (!displayRoomId || displayRoomId === "------") return;
    try {
      await navigator.clipboard.writeText(displayRoomId); // 6桁のコードをコピー
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  useEffect(() => {
    // Google Material Icons を動的に読み込む
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    if (!id) return;

    const fetchInitialData = async () => {
      // 1. ルームの基本情報（ルーム名 & パスワード & 6桁のroom_id）を取得
      const { data: roomData } = await supabase
        .from("rooms")
        .select("name, password, room_id") // 💡 新設した room_id をセレクトに含める
        .eq("id", id)
        .single();
      
      if (roomData) {
        setRoomName(roomData.name);
        setRoomPassword(roomData.password || "なし");
        setDisplayRoomId(roomData.room_id || "未設定"); // 💡 6桁のコードをセット
      }

      // 2. ルームに設定された正解単語リストを取得
      const { data: answersData } = await supabase
        .from("correct_answers")
        .select("answer")
        .eq("room_id", id);
      if (answersData) {
        setCorrectAnswers(answersData.map((item) => item.answer));
      }

      // 3. 既存の参加者（メンバー）を取得
      const { data: memberData } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", id);
      setMembers(memberData || []);

      // 4. 既存のメッセージ（回答）を取得
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id);
      setMessages(msgData || []);
    };

    fetchInitialData();

    // リアルタイム監視：新しい回答の検知
    const messageChannel = supabase
      .channel(`room-messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // リアルタイム監視：新しい参加者の検知
    const memberChannel = supabase
      .channel(`room-members-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_members", filter: `room_id=eq.${id}` },
        (payload) => {
          setMembers((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(memberChannel);
      document.head.removeChild(link);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* 👑 ヘッダーエリア */}
        <header className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-0.5">ホスト管理画面</p>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">{roomName}</h1>
          </div>
          
          <div className="flex flex-col gap-2.5 w-full">
            {/* 💡 ルームID表示エリア（6桁コードに切り替え） */}
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
              <div className="font-mono text-xs md:text-sm">
                <span className="text-slate-400 select-none mr-2">ROOM ID:</span>
                <span className="font-bold text-slate-700 tracking-wider text-base">{displayRoomId}</span>
              </div>
              <button
                onClick={handleCopyId}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 whitespace-nowrap ${
                  copied 
                    ? "bg-emerald-500 text-white shadow-sm" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 shadow-sm"
                }`}
              >
                {copied ? "✓ コピー完了" : "📋 コピー"}
              </button>
            </div>

            {/* パスワード（Google Icon visibility / visibility_off 実装） */}
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
              <div className="font-mono text-xs md:text-sm">
                <span className="text-slate-400 select-none mr-2">PASSWORD:</span>
                <span className="font-bold text-slate-700 tracking-wide">
                  {showPassword ? roomPassword : "•".repeat(roomPassword.length || 4)}
                </span>
              </div>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 whitespace-nowrap shadow-sm flex items-center gap-1"
              >
                {showPassword ? (
                  <>
                    <span className="material-icons text-[18px] leading-none">visibility</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-[18px] leading-none">visibility_off</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 🔑 折りたたみ式の正解単語確認コンポーネント */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="w-full flex justify-between items-center px-5 py-4 font-extrabold text-slate-900 bg-white hover:bg-slate-50/80 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm md:text-base">
              🔑 設定された正解単語の確認
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md font-bold">
              {showAnswers ? "🔼 閉じる" : "🔽 開く"}
            </span>
          </button>
          
          <div className={`transition-all duration-200 ease-in-out border-t border-slate-100 ${
            showAnswers ? "max-h-[500px] p-5 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}>
            {correctAnswers.length === 0 ? (
              <p className="text-xs md:text-sm text-slate-400">設定された正解がありません。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {correctAnswers.map((ans, i) => (
                  <span 
                    key={i} 
                    className="bg-blue-50 text-blue-700 border border-blue-200/60 font-mono font-bold text-xs md:text-sm px-3 py-1.5 rounded-xl shadow-sm"
                  >
                    {ans}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 📊 メインコンテンツ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* 👥 ユーザー一覧 */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 md:col-span-1">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-base md:text-lg text-slate-900">
                👥 参加プレイヤー
              </h2>
              <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-full">
                {members.length} 人
              </span>
            </div>
            
            <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <p className="text-xs md:text-sm text-slate-400 text-center py-6">まだ誰も入室していません</p>
              ) : (
                <ul className="space-y-1.5">
                  {members.map((m, i) => (
                    <li 
                      key={i} 
                      className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      {m.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 📝 回答一覧 */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 md:col-span-2">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-base md:text-lg text-slate-900">
                📝 回答ログ
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full border-collapse bg-white text-left text-xs md:text-sm text-slate-600 min-w-[320px]">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">プレイヤー</th>
                    <th className="px-4 py-3">回答</th>
                    <th className="px-4 py-3 text-center">判定</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                        まだ回答が送信されていません
                      </td>
                    </tr>
                  ) : (
                    [...messages].reverse().map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 truncate max-w-[100px]">{m.username}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 break-all">{m.text}</td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black shadow-sm ${
                            m.is_correct 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {m.is_correct ? "✓ 正解" : "✗ 不正解"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>

      {/* 📋 クレジットフッター */}
      <footer className="w-full text-center text-[11px] text-slate-400 font-semibold pt-12 pb-4 tracking-wider">
        Nazotoki Answer Site 2026 Created by mamemema
      </footer>
    </div>
  );
}