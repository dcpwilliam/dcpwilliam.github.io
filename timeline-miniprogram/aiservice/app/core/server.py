"""HTTP 服务：基于标准库 ThreadingHTTPServer，支持 CORS 与统一异常处理。"""
import logging
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .errors import ApiError
from .http import Request, Response

log = logging.getLogger("aiservice")
access = logging.getLogger("aiservice.access")

MAX_BODY = 8 * 1024 * 1024  # 8MB
LOG_BODY_LIMIT = 300         # 日志里 body 最多记多少字符


def _snip(raw, limit=LOG_BODY_LIMIT):
    """把请求体压成一行，方便日志里看清楚又不刷屏。"""
    if not raw:
        return ""
    try:
        text = raw.decode("utf-8", "ignore")
    except Exception:
        return "<binary %d bytes>" % len(raw)
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit] + " …(+%d)" % (len(text) - limit)


def _qs(req):
    if not req.query:
        return ""
    return "?" + "&".join("%s=%s" % (k, v) for k, v in req.query.items())


def _make_handler(router):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "aiservice"
        router = None  # 由闭包注入

        # ---------- 基础 ----------
        def _read_body(self):
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0:
                return b""
            if length > MAX_BODY:
                raise ApiError("请求体过大", 413)
            return self.rfile.read(length)

        def _send(self, resp):
            body = resp.body or b""
            self.send_response(resp.status)
            self.send_header("Content-Type", resp.content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
            for k, v in resp.headers.items():
                self.send_header(k, v)
            self.end_headers()
            if body:
                self.wfile.write(body)

        def _dispatch(self):
            rid = uuid.uuid4().hex[:8]
            started = time.time()
            req = None
            try:
                req = Request.from_handler(self, self._read_body())
                access.info("→ #%s %s %s%s", rid, req.method, req.path, _qs(req))
                if req.body:
                    access.debug("→ #%s body %s", rid, _snip(req.body))

                if req.method == "OPTIONS":
                    resp = Response.empty(204)
                else:
                    route, params = router.resolve(req.method, req.path)
                    access.debug("→ #%s 命中 %s", rid, route.handler.__name__)
                    result = route.handler(req, **params)
                    resp = result if isinstance(result, Response) else Response.json(result)
            except ApiError as e:
                access.warning("← #%s %s %s 业务异常 %d: %s",
                               rid, (req.method if req else self.command),
                               (req.path if req else self.path), e.status, e.message)
                resp = Response.json(e.to_dict(), e.status)
            except Exception as e:  # 兜底，避免把栈抛给客户端
                log.exception("← #%s 未捕获异常: %s %s", rid, self.command, self.path)
                resp = Response.json({"error": "服务器内部错误", "detail": str(e)}, 500)

            if req is not None:
                access.info("← #%s %s %s %d %.1fms",
                            rid, req.method, req.path, resp.status, (time.time() - started) * 1000)
            resp.headers["X-Request-Id"] = rid
            return resp

        # ---------- 方法入口 ----------
        def do_GET(self):
            self._send(self._dispatch())

        do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = do_GET

        def log_message(self, fmt, *args):
            """http.server 自带的那行访问日志会和 access 日志重复，降为 debug。"""
            log.debug("%s %s", self.address_string(), fmt % args)

    Handler.router = router
    return Handler


def create_server(router, host="127.0.0.1", port=8100):
    handler = _make_handler(router)
    ThreadingHTTPServer.allow_reuse_address = True
    try:
        return ThreadingHTTPServer((host, port), handler)
    except OSError as e:
        if getattr(e, "errno", None) == 48 or "Address already in use" in str(e):
            raise SystemExit(
                "端口 %d 已被占用。换一个端口（PORT=8200 ./start.sh），\n"
                "或者先停掉旧的：lsof -nP -iTCP:%d -sTCP:LISTEN" % (port, port)
            )
        raise


def serve(router, host="127.0.0.1", port=8100, banner=True):
    httpd = create_server(router, host, port)
    if banner:
        _banner(host, port, router)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止", file=sys.stderr)
    finally:
        httpd.server_close()
    return httpd


def _banner(host, port, router):
    from .logging import log_path
    base = "http://%s:%d" % (host, port)
    print("aiservice 已启动:", base)
    print("  健康检查 :", base + "/health")
    print("  接口清单 :", base + "/api/info")
    print("  最近日志 :", base + "/api/logs?lines=50")
    print("  接口数量 :", len(router.routes))
    path = log_path()
    if path:
        print("  日志文件 :", path)
    print()
