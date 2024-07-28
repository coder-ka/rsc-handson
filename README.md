# rsc-handson

このリポジトリはReact Server Component（以下、RSC）を実際に体験して理解するためのハンズオン用に作りました。自由にご利用ください。

```bash
git clone https://github.com/coder-ka/rsc-handson
```

# 前提

- Node.js >=18.18.0
- Docker（Docker Compose）

筆者の環境ではnpm@9.9.3で確認をしました。

インストールが上手くいかない場合は、以下のコマンドでインストールをしてください。

```bash
npm i -g npm@9
```

ハンズオン後に、以前のバージョンに戻したい場合は、

```bash
npm -v
```

でバージョンをメモしておき、

```bash
# x.y.z = 以前のバージョン
npm i -g npm@x.y.z
```

で戻すことができます。

# 環境構築

**※ Wi-fi環境で実行することをオススメします**

npmパッケージのインストール

```bash
npm i
```

DBの立ち上げ（Docker Compose）

```bash
docker-compose up -d
```

※ 53306ポートを使いますが、空いていない場合はdocker-compose.ymlと.envを編集してください

データベースの作成（Prisma Migrate）

```bash
npx prisma migrate dev

? Enter a name for the new migration: › init
```

開発サーバーの立ち上げ

```bash
npm run dev
```

http://localhost:3000

で開発サーバーが立ち上がります。（当ハンズオンではNext.jsのturboモードを使っています）

これで環境構築は完了です。

# Next.jsを使う理由とRSCの現在

RSCは、クライアント用のバンドルとサーバー用のバンドルに分かれてコンパイルされるため、バンドラーによるサポートが必要になります。

Next.jsはReactチームと連携して開発されていて、いち早くRSCの最新機能を安定板として提供しているため、プロダクション用としては現実的な選択肢の一つになります。

RSCはReact19（RC)でリリース予定で、既にマイナーバージョン間での破壊的変更は無いと明言されています。

よって、今の時点で覚えた内容がこれから大きく変わることはないという安心感があります。

では早速、RSCを使った実装を体験していきましょう。

# 非同期サーバーコンポーネントを使ってみる

まず、`app/page.tsx`ファイルを編集します。

このファイルは、`/`でサーバーにアクセスした場合に開かれるページです。

ここをトップページとして、登録されたTODOの一覧を表示したいとします。

今回はPrisma ORMを利用していますが、バックエンドのライブラリは何を使っても構いません。

Page関数にasyncを付け、PrismaClientを利用してTODOを取得し、JSXのマークアップを構築して返す処理を書きます。

```tsx
import { PrismaClient } from "@prisma/client";

export default async function Page() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return <div>
      {
        todos.map(x => <div key={x.id}>{x.name}</div>)
      }
    </div>;
  } catch (error) {
    return <div>システムエラーです</div>
  } finally {
    await prismaClient.$disconnect();
  }
}
```

画面を更新してください。

このままだとデータが取れているか分からないので、予め用意したinsert-todo.tsを実行してください。

```bash
npx tsx insert-todo.ts
```

何回か実行し、画面を更新してみてください。

登録したTodoが表示されていることが分かります。

これが一番シンプルな非同期サーバーコンポーネントの例です。

try句の中で何かエラーをthrowしてみると、画面にはシステムエラーと表示されます。

特に指定しない場合、コンポーネントはサーバーコンポーネントとしてコンパイルされます。

サーバーコンポーネントはサーバーサイドでしか実行されないため、直接データベースやサーバーのファイルシステムなどにアクセスする処理を記載することができます。

ただし、状態やボタンクリック時の処理などのインタラクティビティを持たせるにはクライアントコンポーネントが必要になります。

# クライアントコンポーネントとサーバーアクション

次は、「TODOを追加する」機能を作っていきます。

画面でTODOの内容を入力し、ボタンを押したら追加できるようにします。

まずは先ほど作ったファイルに、入力欄とボタンを追加してみましょう。

```diff
import { PrismaClient } from "@prisma/client";

export default async function Page() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
+        <input
+          style={{
+            marginRight: "4px",
+          }}
+          type="text"
+        />
+        <button>追加</button>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

画面に入力欄とボタンが表示されました。

次に入力欄のテキストをstateにセットし、ボタンに空のイベントハンドラを追加します。

エラーが出ました。

RSCでは、状態を保持したり、イベントハンドラ等のインタラクティビティを定義できないためです。

このような処理はクライアントコンポーネントを作成し、分離します。

`TodoCreationform.tsx`

こちらがクライアントコンポーネントで、"use client"ディレクティブによってファイルがクライアントコンポーネントであることを指定します。

```tsx
"use client"

import { useState } from "react";

export function TodoCreationForm() {
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
      <button onClick={() => {}}>追加</button>
    </>
  );
}
```

`page.tsx`

RSCからは、通常のコンポーネントとしてimportできます。

```diff
import { PrismaClient } from "@prisma/client";
+import { TodoCreationForm } from "../components/TodoCreationForm";

export default async function Page() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
+        <TodoCreationForm></TodoCreationForm>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

クライアントコンポーネントは、クライアントでのみ実行されるため、直接DB接続してデータを登録することができません。

この問題を解決するために、サーバーアクションを定義することができます。

サーバーアクションはサーバーサイドで実行され、クライアントコンポーネントに渡したり、通常の非同期関数として実行することができます。

まず受け取る側のクライアントコンポーネントで、通常の非同期関数として受け取るようにしてみましょう。

`TodoCreationForm.tsx`

```diff
"use client";

import { Todo } from "@prisma/client";
import { useState } from "react";

+export type CreateTodoFn = ({} : { name: string }) => Promise<Todo>;

export function TodoCreationForm({
+    createTodo,
+} : {
+    createTodo: CreateTodoFn
}) {
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
      <button onClick={() => {}}>追加</button>
    </>
  );
}
```

サーバーアクションは、"use server"ディレクティブを使って定義します。

今回は、RSCである`page.tsx`で定義し、クライアントコンポーネントに渡してみましょう。

```diff
+import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { 
    TodoCreationForm,
+    CreateTodoFn,
} from "../components/TodoCreationForm";

export default async function Page() {
+  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
+    "use server";
+
+    const prismaClient = new PrismaClient();
+
+    try {
+      await prismaClient.$connect();
+
+      return await prismaClient.todo.create({
+        data: {
+          id: cuid(),
+          name,
+        },
+      });
+    } catch (error) {
+      console.error(error);
+    } finally {
+      await prismaClient.$disconnect();
+    }
+  };

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
        <TodoCreationForm
+          createTodo={createTodo}
        ></TodoCreationForm>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

今回、サーバーアクションの型はクライアントコンポーネント側で定義し、RSCからimportしてみました。

では、TodoCreationForm.tsxの処理を完成させましょう。

```diff
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
+        onClick={async () => {
+          const todo = await createTodo({
+            name: todoName,
+          });
+
+          console.log(todo);
+
+          setTodoName("");
+
+          alert("追加しました。");
+        }}
      >
        追加
      </button>
    </>
  );
}
```

これで登録処理が書けました。

クライアントサイドでは定義した関数が直接呼び出されているように見えますが、実際はクライアントサイド用のバンドルに含まれる処理を呼び出しています。

サーバーサイドではサーバー用のバンドルに含まれる処理が実行され、通信部分は隠蔽されます。

よって、通信エンドポイントのためのパスを考え、インターフェースについて合意するコストが必要無くなります。

なぜなら、サーバーアクションをコンパイルした時点で、自動的に通信エンドポイントが生成されるからです。

ただし、内部的にはHTTP通信が発生しているため、サーバーアクションの引数や戻り値にJSONにシリアライズできない値（関数やユーザー定義のクラスのインスタンス等）を含めると、問題が起きる場合があります。

作った処理を実際に呼び出すと、アラートが表示されます。

しかし、画面を手動で更新しないと、追加されたTODOが画面に表示されません。

なぜなら、RSCは初回のリクエスト時にサーバーサイドでレンダリングされたっきりで、TODOの追加後に更新する処理を実行していないからです。

# RSCを更新する

RSCを更新する処理は、Next.jsが提供する`revalidatePath`関数を使う必要があります。

```ts
revalidatePath('/')
```

というように、パスを指定することで画面のRSCのツリーを再レンダリングし、画面に反映することができます。

では、`page.tsx`に書いたサーバーアクションで実際に処理を書いてみましょう。

```diff
import cuid from "cuid";
+import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";

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

+      revalidatePath("/");

      return project;
    } catch (error) {
      console.error(error);
    } finally {
      await prismaClient.$disconnect();
    }
  };

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

アプリのデザインにもよりますが、`revalidatePath`の呼び出しは必要ない場合もあります。

例えば、「作成したTODOの詳細画面に遷移する」という仕様の場合は、必要ありません。

ただ`revalidatePath`はあまりエレガントな解決策ではないという意見もあるため、今後より良い方法が見つかるかもしれません。

# ローディングを表示する

今回作ったRSCのコンポーネントは「async=非同期コンポーネント」です。

サーバーサイドでは、レンダリングの完了までawaitする（待つ）ため、データの取得を待つ必要があります。

場合によっては、まずはローディングを表示しておき、データが取得でき次第表示したい場合もあるでしょう。

その場合は、`use`APIと`Suspense`コンポーネントを利用します。

まずは分かりやすくするために、TODOの取得処理を関数に分離します。

`page.tsx`

```diff
import { revalidatePath } from "next/cache";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";

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

  try {
+    const todos = await getTodos();

    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  }
}

+async function getTodos() {
+  const prismaClient = new PrismaClient();
+  try {
+    await prismaClient.$connect();
+
+    const todos = await prismaClient.todo.findMany();
+
+    return todos;
+  } catch (error) {
+    throw error;
+  } finally {
+    await prismaClient.$disconnect();
+  }
+}
```

次に、asyncを取り外し、`use`APIでPromiseからデータを取得するようにします。

```diff
+import { use } from "react";
import { revalidatePath } from "next/cache";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";

export default function Page() {
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

  try {
+    const todos = use(getTodos());

    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
        {todos.map((x) => (
          <div key={x.id}>{x.name}</div>
        ))}
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  }
}
```

画面に「システムエラーです」と表示されてしまいました。

理由は、`use`はまずPromiseをthrowし、そのあとPromiseを待ってから値を返すからです。

try-catchに引っかかったというわけです。

これを解決するには、throwされたPromiseを捕捉し、ローディングの表示にフォールバックする必要があります。

そのために、Suspenseコンポーネントを利用します。

```diff
import { 
+  Suspense,
  use,
} from "react";
import { revalidatePath } from "next/cache";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
+import { sleep } from "../util/sleep";

export default function Page() {
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

  return (
+    <Suspense fallback={<span>...loading</span>}>
+      <TodoList createTodo={createTodo}></TodoList>
+    </Suspense>
  );
}

+function TodoList({ createTodo }: { createTodo: CreateTodoFn }) {
+  const todos = use(getTodos());
+
+  return (
+    <div>
+      <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
+      {todos.map((x) => (
+        <div key={x.id}>{x.name}</div>
+      ))}
+    </div>
+  );
+}

async function getTodos() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

+    await sleep(2000);

    const todos = await prismaClient.todo.findMany();

    return todos;
  } catch (error) {
    throw error;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

TodoListコンポーネントを分離し、Suspenseで囲みました。

Suspenseのfallbackには待っている間（ペンディング状態）で表示するコンポーネントを指定します。

確認のため、`getTodos`の中にsleep処理を書き、２秒かかるようにしています。

画面を更新すると、loading...と表示されます。

しかし、try-catchが書けなくなったことで、エラーのハンドリングができなくなりました。

エラーを捕捉したい場合、ErrorBoundaryを利用します。

`page.tsx`

```diff
import { Suspense, use } from "react";
+import { ErrorBoundary } from "react-error-boundary";
import { revalidatePath } from "next/cache";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { sleep } from "../util/sleep";

export default function Page() {
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

  return (
+    <ErrorBoundary fallback={<div>システムエラーです</div>}>
      <Suspense fallback={<span>...loading</span>}>
        <TodoList createTodo={createTodo}></TodoList>
      </Suspense>
+    </ErrorBoundary>
  );
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

+    throw new Error();

    return todos;
  } catch (error) {
    throw error;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

画面に「システムエラーです」と表示されました。

次のステップに進む前に、`throw new Error();`は消しておいてください。

# 認証を実装する

認証を実装するためには、HTTPリクエストとレスポンスにアクセスする必要があります。

RSC内でそれらにアクセスするためには、`next/headers`パッケージを利用します。

認証前に画面を表示する必要は無い＝必須であるため、非同期コンポーネント内でawaitします。

もう一度、asyncを付け、以下の処理を追加します。

```diff
import { Suspense, use } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { revalidatePath } from "next/cache";
+import { cookies } from "next/headers";
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
+import { Redirect } from "../components/Redirect";
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

+  const prismaClient = new PrismaClient();
+  try {
+    const cookie = cookies();
+    const loginId = cookie.get("login-id")?.value;
+    await prismaClient.$connect();
+
+    const now = new Date();
+    const logins = await prismaClient.login.findMany({
+      where: {
+        id: loginId,
+        expiredAt: {
+          gt: now,
+        },
+      },
+    });
+
+    if (logins.length === 0) {
+      return (
+        <Suspense fallback={<span>...redirecting</span>}>
+          <Redirect url="/login"></Redirect>;
+        </Suspense>
+      );
+    } else {
      return (
        <ErrorBoundary fallback={<div>システムエラーです</div>}>
          <Suspense fallback={<span>...loading</span>}>
            <TodoList createTodo={createTodo}></TodoList>
          </Suspense>
        </ErrorBoundary>
      );
+    }
+  } catch (error) {
+    console.error(error);
+    return <div>システムエラーです</div>;
+  } finally {
+    await prismaClient.$disconnect();
+  }
}
```

これは簡易的な実装で、本来はクッキーの暗号化などが必要ですが、リクエストヘッダーやクッキーから取得したトークン等で認証する点は変わらないでしょう。

クッキーからログインIDを取得し、ログインテーブルから取得できれば認証済みとして扱い、今まで通りのページに入ります。

認証に失敗した場合、ログインページにリダイレクトします。

早速、ログイン先のページを作りましょう。

（Try!!）サーバーコンポーネント・クライアントコンポーネント・サーバーアクションを使って、ログイン機能を作ってみましょう。

`app/login/page.tsx`

```tsx
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
```

`components/LoginForm.tsx`

```tsx
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
```

これまた本来は、クッキーの暗号化やB-cryptなどによるパスワードの暗号化が必要ですが、今回はパスしています。

ログインに失敗すると、アラートが表示されます。

今はアカウントが無いため、スクリプトを実行してアカウントを用意しましょう。

```bash
npx tsx insert-user.ts
```

メールアドレス：`test@example.com`
パスワード：`password`

ログインできましたか？

これでRSCにおける認証の作り方の説明は完了です。

プロダクションにおいては、`next/auth`などと組み合わせて本格的な認証処理を実装してください。

# 終わりに

これでハンズオンは終了です。

いかがだったでしょうか？

今までの「APIを設計して繋げる」というフロントエンドとバックエンドのコンセンサスが求められる従来の開発とは違う雰囲気を感じていただけたでしょうか？

飛躍的に生産性が向上することもご理解いただけたと思います。

RSCはフロントエンド領域の拡張とも言えますが、バックエンドはセキュリティやデータベースの設計などのより重要なタスクに集中できるようになったとも言えます。

あるいは、お互いの職掌領域が曖昧になり、機能横断的な開発に一歩近づいたとも言えます。

確かな事は、２つのシステムを別個に作って通信で繋げるのではなく、通信をほぼ意識しない１つのシステムを作るようになった分、本質的な開発対象に集中できるようになったということです。（これこそがDRYの真髄です。）

RSCの技術的なバックグラウンドは、バンドラーの領域まで踏み込む複雑なものですが、実際に利用する側としてはサーバーコンポーネントを基本としつつ、部分的にクライアントコンポーネントやサーバーアクションを組み合わせることで、むしろ今までよりシンプルにEnd-to-Endな機能が作っていけることは、このハンズオンで示したとおりです。

Next.js以外のフレームワークや、別言語での実装もすぐに可能になるでしょう。

また、RSCは新しい時代を予感させつつ、`use`APIを使って既存のAPIサーバーと通信したり、`"use client"`を利用したクライアントコンポーネントなど、既存のアーキテクチャとの共存も容易です。既存の資産を破壊するような技術ではないのです。

しかし、RSCの方式、ひいては「フロントエンド領域におけるシームレスなクライアント・サーバーの結合」というアーキテクチャがこれからのスタンダードになることを私は望んでいます。

そのためにはこのハンズオンに参加いただいた皆さんが実績を作り、他のエンジニアにも知見を共有いただけることが、何より重要です。

是非、これからの時代を作る一員になってください。

ありがとうございました。

---

このハンズオンに関する問い合わせや質問などは、Issueを立てるか、下記のメールアドレスまでご連絡ください。

katsuyuki.oeda@gmail.com

---

ハンズオン後のソースは、`after-handson`ブランチに入っています。