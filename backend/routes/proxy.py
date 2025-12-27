"""
Proxy route for embedding external sites in Live Editor iframe.

This solves the third-party cookie problem by serving external sites
through the same origin, making all cookies first-party.

Usage:
  POST /config/app-proxy  {"target_url": "http://localhost:3000"}
  GET /app/*              → proxies to configured target
"""

from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse
import httpx
from urllib.parse import urlparse, urljoin
import re
import json
import os
from typing import Optional

router = APIRouter()

# Persist proxy config to file so it survives reloads
CONFIG_FILE = os.path.join(os.path.dirname(__file__), ".proxy_config.json")


def _load_config() -> Optional[str]:
    """Load proxy target from config file."""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                return data.get("target_url")
    except Exception:
        pass
    return None


def _save_config(target_url: Optional[str]) -> None:
    """Save proxy target to config file."""
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"target_url": target_url}, f)
    except Exception:
        pass


# Global state for configured proxy target (with persistence)
_proxy_target: Optional[str] = _load_config()

# Shared HTTP client for connection pooling
http_client = httpx.AsyncClient(
    follow_redirects=True,
    timeout=30.0,
    verify=False  # Allow self-signed certs for local dev
)


@router.post("/config/app-proxy")
async def configure_proxy(request: Request):
    """Configure the target URL for the app proxy."""
    global _proxy_target
    data = await request.json()
    _proxy_target = data.get("target_url", "").rstrip("/")
    _save_config(_proxy_target)  # Persist across reloads
    return {"status": "ok", "target_url": _proxy_target}


@router.get("/config/app-proxy")
async def get_proxy_config():
    """Get current proxy configuration."""
    return {"target_url": _proxy_target}


def inject_select_script(html: str) -> str:
    """Inject the element selection script and fetch interceptor into HTML."""
    select_script = """
<script>
(function() {
  // ========== FETCH/XHR INTERCEPTOR ==========
  // Rewrite relative URLs to go through /app/ proxy
  const rewriteUrl = (url) => {
    if (typeof url !== 'string') return url;
    // Already proxied or absolute external URL
    if (url.startsWith('/app/') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Root-relative URL - prepend /app
    if (url.startsWith('/')) {
      return '/app' + url;
    }
    return url;
  };

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = rewriteUrl(input);
    } else if (input instanceof Request) {
      input = new Request(rewriteUrl(input.url), input);
    }
    return originalFetch.call(this, input, init);
  };

  // Override XMLHttpRequest.open
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    return originalXHROpen.call(this, method, rewriteUrl(url), ...rest);
  };

  // ========== ELEMENT SELECTOR ==========
  let selectMode = false;
  let highlightEl = null;

  // Create highlight overlay
  function createHighlight() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #00ff00;background:rgba(0,255,0,0.1);z-index:999999;display:none;';
    document.body.appendChild(el);
    return el;
  }

  // Handle mouse move - highlight element
  function handleMouseMove(e) {
    if (!selectMode) return;
    const target = e.target;
    if (target === highlightEl) return;

    const rect = target.getBoundingClientRect();
    highlightEl.style.left = rect.left + 'px';
    highlightEl.style.top = rect.top + 'px';
    highlightEl.style.width = rect.width + 'px';
    highlightEl.style.height = rect.height + 'px';
    highlightEl.style.display = 'block';
  }

  // Handle click - select element
  function handleClick(e) {
    if (!selectMode) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const data = {
      tagName: target.tagName.toLowerCase(),
      id: target.id || '',
      classList: Array.from(target.classList),
      textContent: target.textContent?.substring(0, 200) || '',
      xpath: getXPath(target),
      outerHTML: target.outerHTML.substring(0, 2000),
    };

    window.parent.postMessage({ type: 'pixel-forge-element-selected', data }, '*');
    selectMode = false;
    highlightEl.style.display = 'none';
  }

  // Get XPath of element
  function getXPath(el) {
    if (!el) return '';
    if (el.id) return '//*[@id="' + el.id + '"]';
    if (el === document.body) return '/html/body';

    let ix = 0;
    const siblings = el.parentNode?.childNodes || [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === el) {
        return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
        ix++;
      }
    }
    return '';
  }

  // Handle escape key
  function handleKeyDown(e) {
    if (e.key === 'Escape' && selectMode) {
      selectMode = false;
      highlightEl.style.display = 'none';
      window.parent.postMessage({ type: 'pixel-forge-cancel-select' }, '*');
    }
  }

  // Listen for messages from parent
  window.addEventListener('message', (e) => {
    if (e.data.type === 'pixel-forge-toggle-select') {
      selectMode = e.data.enabled;
      if (!highlightEl) highlightEl = createHighlight();
      if (!selectMode) highlightEl.style.display = 'none';
    }
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
})();
</script>
"""
    # Inject before </body> or at end
    if "</body>" in html.lower():
        html = re.sub(r'(</body>)', select_script + r'\1', html, flags=re.IGNORECASE)
    else:
        html += select_script
    return html


def rewrite_urls(html: str, base_url: str) -> str:
    """Rewrite relative URLs to go through proxy."""
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    # Rewrite absolute URLs pointing to the target origin
    html = re.sub(
        rf'(href|src|action)=["\']({re.escape(origin)})(/[^"\']*)?["\']',
        lambda m: f'{m.group(1)}="/app{m.group(3) or ""}"',
        html
    )

    # Root-relative URLs stay as /app/path
    html = re.sub(
        r'(href|src|action)=["\']\/([^"\']*)["\']',
        r'\1="/app/\2"',
        html
    )

    # Also rewrite inline script imports (e.g., Vite's react-refresh)
    # Match: import ... from "/@something" or import "/@something"
    html = re.sub(
        r'(import\s+.*?\s+from\s+["\'])\/(@[^"\']+)(["\'])',
        r'\1/app/\2\3',
        html
    )
    html = re.sub(
        r'(import\s+["\'])\/(@[^"\']+)(["\'])',
        r'\1/app/\2\3',
        html
    )

    return html


def rewrite_js_imports(js: str) -> str:
    """Rewrite ES module imports to go through proxy."""
    # Static imports: import ... from '/path' or import ... from "/path"
    # Use [\s\S]*? to handle multiline imports like: import {\n  foo\n} from "..."
    js = re.sub(
        r'(import\s+[\s\S]*?\s+from\s+["\'])\/([^"\']+)(["\'])',
        r'\1/app/\2\3',
        js
    )
    # Side-effect imports: import '/path' or import "/path" (no from, e.g., CSS)
    js = re.sub(
        r'(import\s+["\'])\/([^"\']+)(["\'])',
        r'\1/app/\2\3',
        js
    )
    # Dynamic imports: import('/path') or import("/path")
    js = re.sub(
        r'(import\s*\(\s*["\'])\/([^"\']+)(["\'])',
        r'\1/app/\2\3',
        js
    )
    # new URL('/path', import.meta.url) pattern used by Vite for assets
    js = re.sub(
        r'(new\s+URL\s*\(\s*["\'])\/([^"\']+)(["\'])',
        r'\1/app/\2\3',
        js
    )
    # Also handle export ... from "/path" statements
    js = re.sub(
        r'(export\s+[\s\S]*?\s+from\s+["\'])\/([^"\']+)(["\'])',
        r'\1/app/\2\3',
        js
    )
    return js


def rewrite_cookies(cookies: str) -> str:
    """Remove domain/path restrictions from cookies."""
    # Remove Domain= attribute
    cookies = re.sub(r';\s*[Dd]omain=[^;]*', '', cookies)
    # Change SameSite to Lax (works same-origin)
    cookies = re.sub(r';\s*[Ss]ame[Ss]ite=[^;]*', '; SameSite=Lax', cookies)
    # Remove Secure flag for localhost
    if 'localhost' in cookies or '127.0.0.1' in cookies:
        cookies = re.sub(r';\s*[Ss]ecure\b', '', cookies)
    return cookies


@router.api_route("/app/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@router.api_route("/app", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_app(request: Request, path: str = ""):
    """Proxy requests to the configured target URL."""
    global _proxy_target

    if not _proxy_target:
        return HTMLResponse(
            content="<h1>No app configured</h1><p>Use the URL input above to load an app.</p>",
            status_code=200
        )

    # Build target URL
    target_url = f"{_proxy_target}/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    # Forward headers (excluding hop-by-hop)
    headers = {}
    for key, value in request.headers.items():
        if key.lower() not in ["host", "content-length", "transfer-encoding", "connection"]:
            headers[key] = value

    # Forward body for POST/PUT/PATCH
    body = await request.body() if request.method in ["POST", "PUT", "PATCH"] else None

    try:
        response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )
    except Exception as e:
        return HTMLResponse(
            content=f"<h1>Proxy Error</h1><p>{str(e)}</p><p>Target: {target_url}</p>",
            status_code=502
        )

    # Build response headers
    response_headers = {}
    for key, value in response.headers.items():
        key_lower = key.lower()

        # Skip hop-by-hop headers
        if key_lower in ["transfer-encoding", "connection", "keep-alive", "content-encoding"]:
            continue

        # Rewrite cookies for same-origin
        if key_lower == "set-cookie":
            value = rewrite_cookies(value)

        # Remove X-Frame-Options to allow iframe
        if key_lower == "x-frame-options":
            continue

        # Remove CSP frame-ancestors
        if key_lower == "content-security-policy":
            value = re.sub(r"frame-ancestors[^;]*;?\s*", "", value)

        response_headers[key] = value

    content = response.content
    content_type = response.headers.get("content-type", "")

    # Process HTML responses
    if "text/html" in content_type:
        html = content.decode("utf-8", errors="replace")
        html = rewrite_urls(html, _proxy_target)
        html = inject_select_script(html)
        content = html.encode("utf-8")
        if "content-length" in response_headers:
            response_headers["content-length"] = str(len(content))

    # Process JavaScript responses (rewrite ES module imports)
    elif any(js_type in content_type for js_type in ["javascript", "application/x-javascript", "text/jsx", "text/typescript"]):
        js = content.decode("utf-8", errors="replace")
        js = rewrite_js_imports(js)
        content = js.encode("utf-8")
        if "content-length" in response_headers:
            response_headers["content-length"] = str(len(content))

    return Response(
        content=content,
        status_code=response.status_code,
        headers=response_headers,
        media_type=content_type.split(";")[0] if content_type else None
    )
