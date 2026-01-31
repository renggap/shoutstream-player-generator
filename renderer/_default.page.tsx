import React from 'react';
import { escapeInject } from 'vike/server';
import type { PageContext } from 'vike/types';

export default function Root({ Page, pageProps }: PageContext) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ShoutStream Player Generator</title>
      </head>
      <body>
        <div id="page-view">
          <Page {...pageProps} />
        </div>
      </body>
    </html>
  );
}

export const passToClient = ['pageProps'];
