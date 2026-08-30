'use strict';

/**
 * 可选的本地预览：只服务本仓库根目录源码，不经过 release/。
 * 用法：npm run dev
 *
 * 默认从 5288 起找空闲端口（避免误用其它项目常用端口，如 4173）。
 * 也可用环境变量：PREVIEW_HOST / PREVIEW_PORT
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.PREVIEW_HOST || '127.0.0.1';
const PREFERRED_PORT = Number(process.env.PREVIEW_PORT || 5288);
const MAX_PORT_TRIES = 30;

const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
});

function contentType(filePath) {
  return TYPES[path.extname(filePath).toLowerCase()] ||
    'application/octet-stream';
}

function safeResolve(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const absolute = path.resolve(ROOT, relative);
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) {
    return null;
  }
  return absolute;
}

function createServer() {
  return http.createServer(function (req, res) {
    const requestUrl = new URL(req.url || '/', 'http://' + HOST);
    const filePath = safeResolve(requestUrl.pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(filePath, function (statError, stat) {
      let target = filePath;
      if (!statError && stat.isDirectory()) {
        target = path.join(filePath, 'index.html');
      }
      fs.readFile(target, function (readError, data) {
        if (readError) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType(target),
          'Cache-Control': 'no-store',
          'X-Xiuxian-Root': ROOT
        });
        res.end(data);
      });
    });
  });
}

function listen(port, attempt) {
  const server = createServer();
  server.once('error', function (error) {
    if (error && error.code === 'EADDRINUSE' && attempt + 1 < MAX_PORT_TRIES) {
      listen(port + 1, attempt + 1);
      return;
    }
    console.error(
      '无法启动预览服务：' + (error && error.message ? error.message : error)
    );
    process.exitCode = 1;
  });
  server.listen(port, HOST, function () {
    const address = server.address();
    const actualPort = address && address.port ? address.port : port;
    console.log('本仓库开发预览（根目录源码）');
    console.log('  URL : http://' + HOST + ':' + actualPort + '/');
    console.log('  目录: ' + ROOT);
    console.log('  说明: 日常请预览根目录；release/ 仅打包时同步。');
    if (actualPort !== PREFERRED_PORT) {
      console.log(
        '  提示: 端口 ' + PREFERRED_PORT +
          ' 已被占用，已自动改用 ' + actualPort
      );
    }
  });
}

listen(PREFERRED_PORT, 0);
