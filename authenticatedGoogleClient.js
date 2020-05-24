import http from "http";
import url from "url";
import fs from "fs";
import readline from "readline";
import util from "util";
import opn from "opn";
import { google } from "googleapis";

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const createRedirectServer = () => {
  const httpServer = http
    .createServer((request, response) => {
      const code = url.parse(request.url, true).query.code;
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`
        <!doctype html>
        <html>
          <head>
            <title>Google API OAuth 2 Code</title>
            <style>
              body, html {
                height: 100%;
              }
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
              }
            </style>
          </head>
          <body>
            <pre>${code}</pre>
          </body>
        </html>
      `);
      httpServer.close();
    })
    .listen(80);
};

const createTokenAsync = async ({ tokenPath, scope }) => {
  let token;

  try {
    const tokenBuffer = await readFileAsync(tokenPath);
    token = JSON.parse(tokenBuffer);
  } catch (error) {
    console.error(error);
  }

  if (typeof token === "undefined") {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope
    });

    createRedirectServer();

    opn(authUrl);

    const readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readlineInterface.question[util.promisify.custom] = (query) =>
      new Promise((resolve) => {
        readlineInterface.question(query, resolve);
      });
    const questionAsync = util.promisify(readlineInterface.question);

    const code = await questionAsync("Enter the provided OAuth 2 code: ");

    readlineInterface.close();

    const getTokenAsync = util
      .promisify(oAuth2Client.getToken)
      .bind(oAuth2Client);

    const token = await getTokenAsync(code);

    await writeFileAsync(tokenPath, JSON.stringify(token));
  }

  return token;
};

export default async ({ credentialsPath, tokenPath, scope }) => {
  const credentialsBuffer = await readFileAsync(credentialsPath);
  const { client_id, client_secret, redirect_uris } = JSON.parse(
    credentialsBuffer
  );

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = await createTokenAsync({ tokenPath, scope });

  oAuth2Client.setCredentials(token);

  google.options({ auth: oAuth2Client });

  return google;
};
