"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HostPage() {
  const { id } = useParams(); // id = ルームID
  const [roomName, setRoomName] = useState<string>("読み込み中...");
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // ルームIDをクリップボードにコピーする関数
  const handleCopyId = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(Array.isArray(id) ? id[0] : id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後にボタンの文字を元に戻す
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
      // 1. ルームの基本情報（ルーム名）を取得
      const { data: roomData } = await supabase
        .from("rooms")
        .select("name")
        .eq("id", id)
        .single();
      if (roomData) {
        setRoomName(roomData.name);
      }

      // 2. 既存の参加者（メンバー）を取得
      const { data: memberData } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", id);
      setMembers(memberData || []);

      // 3. 既存のメッセージ（回答）を取得
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
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ヘッダーエリア（ルーム名 & ルームID） */}
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">ホスト管理画面</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{roomName}</h1>
          </div>
          
          <div className="bg-slate-100 px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="font-mono text-sm">
              <span className="text-slate-400 select-none mr-2">ROOM ID:</span>
              <span className="font-bold text-slate-700">{id}</span>
            </div>
            <button
              onClick={handleCopyId}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 ${
                copied 
                  ? "bg-emerald-500 text-white shadow-sm" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-300 shadow-sm"
              }`}
            >
              {copied ? "✓ コピー完了" : "📋 コピー"}
            </button>
          </div>
        </header>

        {/* メインコンテンツ（2カラムレイアウト） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* ユーザー一覧（左側 1カラム分） */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 md:col-span-1">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                参加プレイヤー
              </h2>
              <span className="bg-blue-100 text-blue-700 font-bold text-sm px-2.5 py-0.5 rounded-full">
                {members.length} 人
              </span>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">まだ誰も入室していません</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m, i) => (
                    <li 
                      key={i} 
                      className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors"
                    >
                      {m.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 回答一覧（右側 2カラム分） */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 md:col-span-2">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                回答ログ
              </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80">
              <table className="w-full border-collapse bg-white text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">プレイヤー</th>
                    <th className="px-6 py-3.5">回答テキスト</th>
                    <th className="px-6 py-3.5 text-center">判定結果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        まだ回答が送信されていません
                      </td>
                    </tr>
                  ) : (
                    // 最新の回答が「一番上」にくるように配列を逆順（reverse）にして表示します
                    [...messages].reverse().map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{m.username}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{m.text}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
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
    </div>
  );
}