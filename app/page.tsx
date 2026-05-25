"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  // --- 状態（State）の定義 ---
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [username, setUsername] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const router = useRouter();

  // --- 部屋に参加する処理 ---
  const joinRoom = async () => {
    if (!username.trim() || !roomId.trim() || !joinPassword.trim() || isJoining) return;
    try {
      setIsJoining(true);
      const res = await fetch("/api/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomId.trim(),
          password: joinPassword.trim(),
          username: username.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "エラーが発生しました");
        return;
      }

      router.push(`/room/${data.actualRoomId}?name=${username.trim()}`);
    } catch (error) {
      console.error(error);
      alert("通信に失敗しました");
    } finally {
      setIsJoining(false);
    }
  };

  // --- 部屋を作成する処理 ---
  const createRoom = async () => {
    // 💡 部屋名とパスワードのみを必須チェック対象に変更
    if (!roomName.trim() || !createPassword.trim() || isCreating) return;
    try {
      setIsCreating(true);
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim(),
          password: createPassword.trim(),
          answers: [], // 💡 最初の正解単語は空の配列として安全に送信
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "部屋の作成に失敗しました");
        return;
      }

      router.push(`/host/${data.roomId}`);
    } catch (error) {
      console.error(error);
      alert("通信に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  // 💡 ボタンを活性化させるかどうかの判定ロジック（answersのチェックを排除）
  const isCreateDisabled = !roomName.trim() || !createPassword.trim() || isCreating;
  const isJoinDisabled = !username.trim() || !roomId.trim() || !joinPassword.trim() || isJoining;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* 👑 サイトタイトルロゴエリア */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            NAZOTOKI ANSWER SITE
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-bold tracking-wide">
            謎解き・クイズのリアルタイム回答・集計プラットフォーム
          </p>
        </div>

        {/* 🔄 Create と Join の2分割グリッドエリア */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* 🟦 独立カード1：部屋作成（Room Create） */}
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-1 rounded-md">HOST MODE</span>
                <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                  <span>🛠️</span> 新しい部屋をつくる
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 pl-1">Room Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 pl-1">Password <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="部屋のパスワードを設定してください"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={createRoom}
              disabled={isCreateDisabled}
              className={`w-full py-3.5 rounded-xl font-black text-base shadow-sm transition-all duration-150 active:scale-[0.98] ${
                isCreateDisabled
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10"
              }`}
            >
              {isCreating ? "生成中..." : "部屋を作成"}
            </button>
          </section>

          {/* 🟩 独立カード2：部屋参加（Room Join） */}
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">PLAYER MODE</span>
                <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                  <span>🚪</span> 部屋に参加する
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 pl-1">Your Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 pl-1">Room ID (6桁数字) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold tracking-wider text-sm uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 pl-1">Password <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="設定されたパスワードを入力してください"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={joinRoom}
              disabled={isJoinDisabled}
              className={`w-full py-3.5 rounded-xl font-black text-base shadow-sm transition-all duration-150 active:scale-[0.98] ${
                isJoinDisabled
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/10"
              }`}
            >
              {isJoining ? "入室中..." : "部屋に参加"}
            </button>
          </section>

        </div>
      </div>

      {/* 📋 クレジットフッター */}
      <footer className="w-full text-center text-[10px] text-slate-400 font-semibold pt-16 pb-4 tracking-wider">
        Nazotoki Answer Site 2026 Created by mamemema
      </footer>
    </div>
  );
}