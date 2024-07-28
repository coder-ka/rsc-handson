"use client";

import { Todo } from "@prisma/client";
import { useState } from "react";

export type CreateTodoFn = ({}: { name: string }) => Promise<Todo>;

export function TodoCreationForm({ createTodo }: { createTodo: CreateTodoFn }) {
  const [todoName, setTodoName] = useState("");
  return (
    <>
      <input
        style={{
          marginRight: "4px",
        }}
        type="text"
        value={todoName}
        onInput={(e) => setTodoName((e.target as HTMLInputElement).value)}
      />
      <button
        onClick={async () => {
          const todo = await createTodo({
            name: todoName,
          });

          console.log(todo);

          setTodoName("");

          alert("追加しました。");
        }}
      >
        追加
      </button>
    </>
  );
}
