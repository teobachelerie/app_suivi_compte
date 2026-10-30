import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <title>Finelio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finelio" />
        <meta name="theme-color" content="#E9E6E2" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `var d=document.documentElement;try{d.setAttribute("data-theme",localStorage.getItem("expenses-theme")==="dark"?"dark":"light");}catch(e){d.setAttribute("data-theme","light");}`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
