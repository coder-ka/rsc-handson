import { Suspense, use } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { Redirect } from "../components/Redirect";
import { sleep } from "../util/sleep";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      const project = await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return project;
    } catch (error) {
      console.error(error);
    } finally {
      await prismaClient.$disconnect();
    }
  };

  const prismaClient = new PrismaClient();
  try {
    const cookie = cookies();
    const loginId = cookie.get("login-id")?.value;
    await prismaClient.$connect();

    const now = new Date();
    const logins = await prismaClient.login.findMany({
      where: {
        id: loginId,
        expiredAt: {
          gt: now,
        },
      },
    });

    if (logins.length === 0) {
      console.log("!!!");
      return (
        <Suspense fallback={<span>...redirecting</span>}>
          <Redirect url="/login"></Redirect>;
        </Suspense>
      );
    } else {
      return (
        <ErrorBoundary fallback={<div>システムエラーです</div>}>
          <Suspense fallback={<span>...loading</span>}>
            <TodoList createTodo={createTodo}></TodoList>
          </Suspense>
        </ErrorBoundary>
      );
    }
  } catch (error) {
    console.error(error);
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}

function TodoList({ createTodo }: { createTodo: CreateTodoFn }) {
  const todos = use(getTodos());

  return (
    <div>
      <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
      {todos.map((x) => (
        <div key={x.id}>{x.name}</div>
      ))}
    </div>
  );
}

async function getTodos() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    await sleep(2000);

    const todos = await prismaClient.todo.findMany();

    return todos;
  } catch (error) {
    throw error;
  } finally {
    await prismaClient.$disconnect();
  }
}
