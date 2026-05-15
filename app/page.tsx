// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.tsx file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function Home() {
//   const [roomId, setRoomId] = useState("");
//   const [password, setPassword] = useState("");
//   const [userName, setUsername] = useState("");
//   const router = useRouter();

// const joinRoom = async () => {
//   const res = await fetch("/api/join-room", {
//     method: "POST",
//     body: JSON.stringify({
//       roomId,
//       password,
//       username,
//     }),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     alert(data.error);
//     return;
//   }

//   router.push(`/room/${roomId}?name=${username}`);
// };

// const createRoom = async () => {
//   const res = await fetch("/api/create-room", {
//     method: "POST",
//     body: JSON.stringify({
//       name: roomName,
//       password,
//       answers: answers.split(","),
//     }),
//   });

//   const data = await res.json();

//   router.push(`/host/${data.roomId}`);
// };

// return (
//     <div>
//       <h1>Room Create</h1>

//       <input
//         placeholder="部屋名"
//         value={roomName}
//         onChange={(e) => setRoomName(e.target.value)}
//       />

//       <input
//         placeholder="パスワード"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//       />

//       <input
//         placeholder="正解（カンマ区切り）"
//         value={answers}
//         onChange={(e) => setAnswers(e.target.value)}
//       />

//       <button onClick={createRoom}>部屋作成</button>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  // --- 状態（State）の定義 ---
  const [roomId, setRoomId] = useState(""); // 既存：部屋に参加する際に使う想定
  const [roomName, setRoomName] = useState(""); // 追加：部屋を作成する時の名前
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // 修正：小文字のusernameに統一
  const [answers, setAnswers] = useState(""); // 追加：クイズの正解（カンマ区切り文字列）

  const router = useRouter();

  // --- 部屋に参加する処理 ---
  const joinRoom = async () => {
    try {
      const res = await fetch("/api/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // 追加：JSONを送る際のマナー
        body: JSON.stringify({
          roomId,
          password,
          username, // 修正：定義と一致させました
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "エラーが発生しました");
        return;
      }

      router.push(`/room/${roomId}?name=${username}`);
    } catch (error) {
      console.error(error);
      alert("通信に失敗しました");
    }
  };

  // --- 部屋を作成する処理 ---
  const createRoom = async () => {
    try {
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // 追加
        body: JSON.stringify({
          name: roomName,
          password,
          answers: answers.split(",").map((ans) => ans.trim()), // 改善：前後の余計な空白を削除
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
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
      <h1>Room Create</h1>

      <input
        placeholder="部屋名"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />

       <input
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />


      <input
        placeholder="正解（カンマ区切り）"
        value={answers}
        onChange={(e) => setAnswers(e.target.value)}
      />

      <button onClick={createRoom}>部屋作成</button>

      {/* 
        補足：現在のHTMLには「部屋に参加する（joinRoom）」ためのUI（roomIdやusernameの入力欄）がありません。
        もし同じ画面に参加機能もつける場合は、以下のような入力欄とボタンが必要です。
      */}
      {/* 
      <hr />
      <h1>Room Join</h1>
      <input placeholder="ユーザー名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="ルームID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={joinRoom}>部屋に参加</button> 
      */}
    </div>
  );
}