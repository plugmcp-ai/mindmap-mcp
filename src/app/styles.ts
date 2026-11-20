/**
 * Styles for the toolbar and panels around the canvas. They are a string put in
 * a style tag, so the view stays one file and loads nothing from outside.
 * Colors come from the theme through the --mm-* variables set on .mm-root.
 */
export const STYLES = `
.mm-root{position:relative;display:flex;flex-direction:column;width:100%;box-sizing:border-box;color:var(--mm-text);font-size:13px;line-height:1.4;overflow:hidden}
.mm-root *{box-sizing:border-box}
.mm-bar{display:flex;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid var(--mm-line);background:var(--mm-bg);flex:none;min-height:44px}
.mm-grow{flex:1 1 auto}
.mm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:32px;height:32px;padding:0 7px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--mm-text);font:inherit;cursor:pointer;white-space:nowrap}
.mm-btn:hover:not(:disabled){background:color-mix(in srgb,var(--mm-text) 9%,transparent)}
.mm-btn:focus-visible,.mm-link:focus-visible,.mm-item:focus-visible,.mm-chip-btn:focus-visible,.mm-canvas:focus-visible,.mm-ask input:focus-visible{outline:2px solid var(--mm-accent);outline-offset:1px}
.mm-btn:disabled{opacity:.4;cursor:default}
.mm-btn[aria-pressed="true"]{background:color-mix(in srgb,var(--mm-accent) 18%,transparent);border-color:color-mix(in srgb,var(--mm-accent) 55%,transparent)}
.mm-btn-text{padding:0 10px;border-color:var(--mm-line)}
.mm-primary{background:var(--mm-accent);border-color:var(--mm-accent);color:#fff}
.mm-primary:hover:not(:disabled){background:var(--mm-accent);filter:brightness(1.08)}
.mm-menu{position:relative}
.mm-pop{position:absolute;top:calc(100% + 4px);left:0;z-index:20;min-width:190px;max-width:320px;max-height:330px;overflow:auto;padding:4px;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-bg);box-shadow:0 8px 28px rgba(0,0,0,.22)}
.mm-pop-right{left:auto;right:0}
.mm-item{display:flex;align-items:flex-start;gap:6px;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--mm-text);font:inherit;text-align:left;cursor:pointer}
.mm-item:hover{background:color-mix(in srgb,var(--mm-text) 9%,transparent)}
.mm-item-mark{flex:none;width:16px;height:18px;display:inline-flex;align-items:center;color:var(--mm-accent)}
.mm-item-text{display:flex;flex-direction:column;gap:1px}
.mm-item-hint{color:var(--mm-muted);font-size:11.5px}
.mm-stage{position:relative;flex:1 1 auto;min-height:0}
.mm-canvas{position:absolute;inset:0;overflow:hidden;touch-action:none;outline:none}
.mm-rename{position:absolute;transform:translate(-50%,-50%);padding:4px 8px;border:2px solid;border-radius:8px;text-align:center;outline:none}
.mm-toast{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);max-width:calc(100% - 24px);padding:8px 12px;border:1px solid var(--mm-line);border-radius:10px;background:var(--mm-bg);box-shadow:0 6px 20px rgba(0,0,0,.2);font-size:12.5px}
.mm-manual{position:absolute;inset:12px;display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--mm-line);border-radius:12px;background:var(--mm-bg);box-shadow:0 8px 28px rgba(0,0,0,.25)}
.mm-manual p{margin:0}
.mm-manual textarea{flex:1;width:100%;padding:8px;border:1px solid var(--mm-line);border-radius:8px;background:var(--mm-surface);color:var(--mm-text);font:inherit;resize:none}
.mm-node{flex:none;display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-top:1px solid var(--mm-line);background:var(--mm-bg)}
.mm-node-head{display:flex;align-items:center;gap:8px;min-width:0}
.mm-node-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px}
.mm-link{padding:4px 2px;border:0;background:transparent;color:var(--mm-muted);font:inherit;cursor:pointer;white-space:nowrap;border-radius:4px}
.mm-link:hover{color:var(--mm-text);text-decoration:underline}
.mm-note{margin:0;color:var(--mm-muted);max-height:3.9em;overflow:auto}
.mm-actions{display:flex;gap:6px;overflow-x:auto;padding-bottom:1px}
.mm-chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border:1px solid var(--mm-line);border-radius:999px;font-size:11.5px;white-space:nowrap;color:var(--mm-muted)}
.mm-chip-btn{height:30px;padding:0 12px;background:transparent;color:var(--mm-text);font:inherit;cursor:pointer;flex:none}
.mm-chip-btn:hover{background:color-mix(in srgb,var(--mm-accent) 16%,transparent);border-color:var(--mm-accent)}
.mm-ask{display:flex;gap:6px}
.mm-ask input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--mm-line);border-radius:8px;background:var(--mm-surface);color:var(--mm-text);font:inherit}
.mm-ask input::placeholder{color:var(--mm-muted)}
.mm-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--mm-muted);padding:24px;text-align:center}
.mm-compact .mm-bar{padding:5px 6px}
.mm-compact .mm-stage{flex:none;height:400px}
.mm-compact .mm-empty{min-height:200px}
.mm-compact .mm-node-head .mm-link{font-size:12px}
@media (prefers-reduced-motion:reduce){.mm-root *{transition:none!important;animation:none!important}}
`;
