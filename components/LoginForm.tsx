"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@prisma/client";

export type LoginFn = ({}: Pick<User, "email" | "password">) => Promise<
  | {
      type: "login-failed";
    }
  | {
      type: "login-success";
    }
>;

export function LoginForm({ login }: { login: LoginFn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  return (
    <div>
      <div>
        メールアドレス：
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
        />
      </div>
      <div>
        パスワード：
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
        />
      </div>
      <button
        onClick={async () => {
          const result = await login({
            email,
            password,
          });

          if (result.type === "login-failed") {
            alert("ログインに失敗しました。");
          } else if (result.type === "login-success") {
            router.push("/");
          }
        }}
      >
        ログイン
      </button>
    </div>
  );
}
