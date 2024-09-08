# rsc-handson

[[ja]](./README.md)
[[en]](./README-en.md)

このリポジトリはReact Server Component（以下、RSC）を実際に体験して理解するためのハンズオン用に作りました。自由にご利用ください。

```bash
git clone https://github.com/coder-ka/rsc-handson
```

データの取得・登録、そして認証までをカバーすることで実用性を示しました。

ハンズオンの開催者側は、VSCode等のエディタ画面を固定で共有し、裏でこのREADMEのテキストをベースに進めることをオススメします。

# 目次

- [目次](#目次)
- [前提](#前提)
- [環境構築](#環境構築)
- [Next.jsを使う理由とRSCの現在](#nextjsを使う理由とrscの現在)
- [非同期サーバーコンポーネント](#非同期サーバーコンポーネント)
- [クライアントコンポーネントとサーバーアクション](#クライアントコンポーネントとサーバーアクション)
- [RSCを更新する](#rscを更新する)
- [ローディングを表示する](#ローディングを表示する)
- [認証を実装する](#認証を実装する)
- [終わりに](#終わりに)

# 前提

- Node.js >=18.18.0
- Docker（Docker Compose）

npmについては、筆者の環境ではv9.9.3で確認をしました。

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
docker compose up -d
```

※ 53306ポートを使いますが、空いていない場合はdocker-compose.ymlと.envを編集してください

データベースの作成

```bash
npx prisma migrate dev

? Enter a name for the new migration: › init
```

開発サーバーの立ち上げ

```bash
npm run dev
```

http://localhost:3000

で開発サーバーが立ち上がります。

`hello world`と表示されることを確認してください。

これで環境構築は完了です。

# DB確認

DBの確認を兼ねて、予め用意したinsert-todo.tsを実行してください。

```bash
npx tsx insert-todo.ts
```

何回か実行してみてください。

# Next.jsを使う理由とRSCの現在

RSCは、クライアント用のバンドルとサーバー用のバンドルに分かれてコンパイルされるため、バンドラーによるサポートが必要になります。

Next.jsはReactチームと連携して開発されていて、いち早くRSCの最新仕様を安定板として提供しているため、プロダクション用としては現実的な選択肢の一つになります。

また、RSCについてのNext.js独自の仕様はほとんどなく、Reactの標準的な方法によってサーバーサイドレンダリングが実現されます。

よって、フレームワークを変えてもほぼ同じように書けると思ってもらって大丈夫です。

更に、RSCはReact19（RC)でリリース予定で、既にマイナーバージョン間での破壊的変更は無いと明言されています。

今の時点で覚えた内容がこれから大きく変わることはないため、先んじて学ぶなら今（2024年7月現在）が最高のタイミングかもしれません。

では早速、RSCを使った実装を体験していきましょう。

# 非同期サーバーコンポーネント

まず、`app/page.tsx`ファイルを編集します。

このファイルは、`/`でサーバーにアクセスした場合に開かれるページです。

ここをトップページとして、登録されたTODOの一覧を表示したいとします。

今回はPrisma ORMを利用していますが、バックエンドのライブラリは何を使っても構いません。

Page関数に`async`を付け、PrismaClientを利用してTODOを取得し、JSXのマークアップを構築して返す処理を書きます。

`app/page.tsx`

```tsx
import { PrismaClient } from "@prisma/client";

export default async function Page() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return <ul>
      {
        todos.map(x => <li key={x.id}>{x.name}</li>)
      }
    </ul>;
  } catch (error) {
    return <div>システムエラーです</div>
  } finally {
    await prismaClient.$disconnect();
  }
}
```

画面を更新してください。

登録したTODOが表示されていることが分かります。

これが一番シンプルな非同期サーバーコンポーネントの例です。

try句の中でエラーをthrowしてみると、画面にはシステムエラーと表示されます。

極めて直観的に機能を構築できました。

お気づきかもしれませんが、デフォルトでコンポーネントはサーバーコンポーネントとしてコンパイルされます。

サーバーコンポーネントはサーバーサイドでしか実行されないため、直接データベースやサーバーのファイルシステムなどにアクセスする処理を記載することができ、`async-await`でレンダリングを非同期にすることもできます。

ただし、状態を持ったり、ボタンクリック時の処理などのインタラクティビティを持たせるにはクライアントコンポーネントが必要になります。

# クライアントコンポーネントとサーバーアクション

次は、「TODOを追加する」機能を作っていきます。

画面でTODOの内容を入力し、ボタンを押したら追加できるようにします。

まずは先ほど作ったファイルに、入力欄とボタンを追加してみましょう。

`app/page.tsx`

```diff
import { PrismaClient } from "@prisma/client";

export default async function Page() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
+       <input type="text" />
+       <button>追加</button>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
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

次に入力欄のテキストを状態として保持し、ボタンにイベントハンドラを追加します。

`app/page.tsx`

```diff
import { PrismaClient } from "@prisma/client";
+import { useState } from "react";

export default async function Page() {
+ const [todoName, setTodoName] = useState("");

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return (
      <div>
        <input
          type="text"
+         value={todoName}
+         onInput={(e) => setTodoName((e.target as HTMLInputElement).value)}
        />
        <button 
+         onClick={() => {}}
        >追加</button>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

エラーが出ました。

RSCでは、状態を保持したり、イベントハンドラ等のインタラクティビティを定義できないためです。

このような処理は**クライアントコンポーネント**を作成し、分離します。

`components/TodoCreationForm.tsx`

```tsx
"use client"

import { useState } from "react";

export function TodoCreationForm() {
  const [todoName, setTodoName] = useState("");
  return (
    <>
      <input
        type="text"
        value={todoName}
        onInput={(e) => setTodoName((e.target as HTMLInputElement).value)}
      />
      <button onClick={() => {}}>追加</button>
    </>
  );
}
```

こちらがクライアントコンポーネントです。

`"use client"`ディレクティブによってファイルがクライアントコンポーネントであることを指定します。

クライアントコンポーネントは従来のコンポーネントと同様、初回のSSRとクライアントサイドでレンダリングされ、今まで通りの処理を記述できます。

このクライアントコンポーネントを、サーバーコンポーネント内で利用できます。

`app/page.tsx`

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
+       <TodoCreationForm></TodoCreationForm>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

次にボタンのイベントハンドラに登録処理を書きたいわけですが、クライアントコンポーネントではサーバーコンポーネントのように直接DB接続してデータを登録することができません。

この問題を解決するために、**サーバーアクション**を定義することができます。

サーバーアクションはサーバーサイドで実行される関数で、クライアントコンポーネントに渡したり、通常の非同期関数として利用することができます。

まず受け取る側のクライアントコンポーネントで、通常の非同期関数として受け取るようにしてみましょう。

`components/TodoCreationForm.tsx`

```diff
"use client";

import { useState } from "react";

+export type CreateTodoFn = ({}: {
+  name: string;
+}) => Promise<{ type: "success" } | { type: "error" }>;

export function TodoCreationForm({ 
+   createTodo
+}: { 
+   createTodo: CreateTodoFn
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

サーバーアクションは、`"use server"`ディレクティブを使って定義します。

今回は、RSCである`page.tsx`で定義し、クライアントコンポーネントに渡してみましょう。

`app/page.tsx`

```diff
+import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { 
  TodoCreationForm,
+  CreateTodoFn
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
+      await prismaClient.todo.create({
+        data: {
+          id: cuid(),
+          name,
+        },
+      });
+
+      return {
+        type: "success",
+      };
+    } catch (error) {
+      console.error(error);
+
+      return {
+        type: "error",
+      };
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
+         createTodo={createTodo}>
        </TodoCreationForm>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
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

サーバーアクションはファイルに分離したり、RSCであればどこでも定義可能です。

では、登録処理を完成させましょう。

`components/TodoCreationForm.tsx`

```diff
"use client";

import { useState } from "react";

export type CreateTodoFn = ({}: {
  name: string;
}) => Promise<{ type: "success" } | { type: "error" }>;

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
+          const result = await createTodo({
+            name: todoName,
+          });
+
+          if (result.type === "success") {
+            alert("登録が完了しました");
+          } else {
+            alert("登録に失敗しました");
+          }
+        }}
      >
        追加
      </button>
    </>
  );
}
```

これで登録処理が書けました。

クライアントサイドでは定義した関数が直接呼び出されているように見えますが、実際はクライアントサイドのバンドルに含まれる処理を呼び出しています。

クライアントサイドのバンドルにはサーバーアクションの処理は含まれず、サーバーと通信してサーバーサイドで実際のサーバーアクションの中身が呼び出され、戻り値を受け取っています。

サーバーアクションの中でエラーがthrowされた場合、500エラーが返され、クライアントサイドでエラーがthrowされます。

サーバーサイドで起きたエラーの内容は開発中のみ表示され、プロダクション環境では表示されません。

このように通信部分は隠蔽され、エンドポイントのためのパスを考えたり、インターフェースについて合意するコストが激減します。

**サーバーアクションをコンパイルした時点で、自動的に通信エンドポイントが生成される**からです。

ただし、内部的にはHTTP通信が発生しているため、サーバーアクションの引数や戻り値にJSONにシリアライズできない値（関数やユーザー定義のクラスのインスタンス等）を含めると、問題が起きる場合があります。

では、問題無くTODOが登録できることを確認してください。

しかし、一つ問題があります。

画面を手動で更新しないと、追加されたTODOが画面に表示されません。

なぜなら、RSCは初回のリクエスト時にサーバーサイドでレンダリングされたっきりで、TODOの追加後に明示的に「RSCを更新する処理」を実行する必要があるためです。

# RSCを更新する

RSCを更新する処理は、Next.jsが提供する`revalidatePath`関数を使う必要があります。

```ts
revalidatePath('/')
```

というように、パスを指定することで画面にぶらさがるRSCのツリーを再レンダリングし、画面に差分適用することができます。

では、`page.tsx`に書いたサーバーアクションで実際に処理を書いてみましょう。

`app/page.tsx`

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
+import { revalidatePath } from "next/cache";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

+     revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
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
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
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

ここまでに作ったRSCのコンポーネントは「`async`=非同期コンポーネント」です。

サーバーサイドでは、レンダリングの完了までawaitする（待つ）ため、レンダリングが完了するまで画面には何も表示できません。

しかし場合によっては、まずはローディングを表示しておきたいこともあるでしょう。

その場合は、`use`APIと`Suspense`コンポーネントを利用します。

まずは分かりやすくするために、TODOの取得処理を関数に分離します。

`app/page.tsx`

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { revalidatePath } from "next/cache";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
    } finally {
      await prismaClient.$disconnect();
    }
  };

  try {
+    const todos = await getTodos();

    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
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

次に、`use`APIでPromiseからデータを取得するようにします。

`app/page.tsx`

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { revalidatePath } from "next/cache";
+import { use } from "react";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
    } finally {
      await prismaClient.$disconnect();
    }
  };

  try {
+    const todos = use(getTodos());

    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
        <ul>
          {todos.map((x) => (
            <li key={x.id}>{x.name}</li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  }
}

async function getTodos() {
  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$connect();

    const todos = await prismaClient.todo.findMany();

    return todos;
  } catch (error) {
    throw error;
  } finally {
    await prismaClient.$disconnect();
  }
}
```

画面に「システムエラーです」と表示されてしまいました。

理由は、`use`はまず`Promise`を`throw`し、そのあと`Promise`を待ってから値を返すからです。

その機構で`try-catch`に引っかかったというわけです。

これを解決するには、`throw`された`Promise`を捕捉し、ローディングの表示にフォールバックする必要があります。

そのために、`Suspense`コンポーネントを利用します。

`app/page.tsx`

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { revalidatePath } from "next/cache";
import { 
+  Suspense,
  use
} from "react";
+import { sleep } from "../util/sleep";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
    } finally {
      await prismaClient.$disconnect();
    }
  };

  try {
    return (
      <div>
        <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
+        <Suspense fallback={<div>...loading</div>}>
+          <TodoList></TodoList>
+        </Suspense>
      </div>
    );
  } catch (error) {
    return <div>システムエラーです</div>;
  }
}

+function TodoList() {
+  const todos = use(getTodos());
+  return (
+    <ul>
+      {todos.map((x) => (
+        <li key={x.id}>{x.name}</li>
+      ))}
+    </ul>
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

`TodoList`コンポーネントを分離し、`Suspense`で囲みました。

`Suspense`の`fallback`には待っている間（ペンディング状態）で表示するコンポーネントを指定します。

また、確認のために`getTodos`の中にsleep処理を書き、２秒かかるようにしています。

画面を更新すると、loading...と表示されます。

次に`getTodos`で`throw new Error()`をしてみてください。

画面にエラーが表示されてしまいました。

`Suspense`が補足できなかった子コンポーネントで起きたエラーは`UnhandledError`になってしまうためです。

こうしたエラーを捕捉したい場合、`ErrorBoundary`を利用します。

`app/page.tsx`

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { revalidatePath } from "next/cache";
import { Suspense, use } from "react";
import { sleep } from "../util/sleep";
+import { ErrorBoundary } from "react-error-boundary";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
    } finally {
      await prismaClient.$disconnect();
    }
  };

  return (
    <div>
      <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
+      <ErrorBoundary fallback={<div>システムエラーです</div>}>
        <Suspense fallback={<div>...loading</div>}>
          <TodoList></TodoList>
        </Suspense>
+      </ErrorBoundary>
    </div>
  );
}
```

画面に「システムエラーです」と表示されました。

次のステップに進む前に、`throw new Error();`は消しておいてください。

# 小休憩

ここで小休憩を入れましょう。

# 認証を実装する

認証を実装するためには、HTTPリクエストとレスポンスにアクセスする必要があります。

RSC内でそれらにアクセスするためには、`next/headers`パッケージを利用します。

```diff
import cuid from "cuid";
import { PrismaClient } from "@prisma/client";
import { TodoCreationForm, CreateTodoFn } from "../components/TodoCreationForm";
import { revalidatePath } from "next/cache";
import { Suspense, use } from "react";
import { sleep } from "../util/sleep";
import { ErrorBoundary } from "react-error-boundary";
+import { cookies } from "next/headers";
+import { Redirect } from "../components/Redirect";

export default async function Page() {
  const createTodo: CreateTodoFn = async ({ name }: { name: string }) => {
    "use server";

    const prismaClient = new PrismaClient();

    try {
      await prismaClient.$connect();

      await prismaClient.todo.create({
        data: {
          id: cuid(),
          name,
        },
      });

      revalidatePath("/");

      return {
        type: "success",
      };
    } catch (error) {
      console.error(error);

      return {
        type: "error",
      };
    } finally {
      await prismaClient.$disconnect();
    }
  };

+  const prismaClient = new PrismaClient();
+  try {
+    const cookie = cookies();
+    const loginId = cookie.get("login-id")?.value;
+
+    if (!loginId) {
+      return (
+        <Suspense fallback={<span>...redirecting</span>}>
+          <Redirect url="/login"></Redirect>;
+        </Suspense>
+      );
+    }
+
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
+    }
+  } catch (error) {
+    return <div>システムエラーです</div>;
+  } finally {
+    await prismaClient.$disconnect();
+  }

  return (
    <div>
      <TodoCreationForm createTodo={createTodo}></TodoCreationForm>
      <ErrorBoundary fallback={<div>システムエラーです</div>}>
        <Suspense fallback={<div>...loading</div>}>
          <TodoList></TodoList>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

これは簡易的な実装で、本来はクッキーの暗号化などが必要ですが、リクエストヘッダーやクッキーから取得したトークン等で認証する点は変わらないでしょう。

クッキーからログインIDを取得し、ログインテーブルから取得できれば認証済みとして扱い、今まで通りのページに入ります。

認証に失敗した場合、ログインページにリダイレクトします。

早速、ログイン先のページを作りましょう。

## 練習してみましょう

ここまでに覚えた内容を使って、ログイン機能を作ってみましょう。

**仕様**

- メールアドレスとパスワードを入力し、ログインする
- メールアドレスとパスワードが一致するユーザーがいた場合、ログインデータを作成し、そのIDをクッキーにセットする（クッキーのキーは`login-id`）
- ログインに失敗した場合、その旨を表示する
- ログインに成功した場合、`/`に遷移する

DBスキーマは、`prisma/schema.prisma`ファイルで確認できます。

ユーザーは以下のスクリプトで追加しておきます。

```bash
npx tsx insert-user.ts
```

メールアドレス：`test@example.com`
パスワード：`password`

## 以下、回答

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
