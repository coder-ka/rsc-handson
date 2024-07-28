import { PrismaClient } from "@prisma/client";
import { LoginFn, LoginForm } from "../../components/LoginForm";
import cuid from "cuid";
import { cookies } from "next/headers";

export default async function Page() {
  const login: LoginFn = async ({ email, password }) => {
    "use server";

    const prismaClient = new PrismaClient();
    try {
      await prismaClient.$connect();

      const users = await prismaClient.user.findMany({
        where: {
          email,
          password,
        },
      });

      if (users.length === 0) {
        return {
          type: "login-failed",
        };
      }

      const now = new Date();

      const login = await prismaClient.login.create({
        data: {
          id: cuid(),
          userId: users[0].id,
          expiredAt: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate()
          ),
        },
      });

      const cookie = cookies();
      cookie.set("login-id", login.id);

      return {
        type: "login-success",
      };
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await prismaClient.$disconnect();
    }
  };

  return <LoginForm login={login}></LoginForm>;
}
