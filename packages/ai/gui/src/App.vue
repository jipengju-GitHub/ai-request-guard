<script setup lang="ts">
import { inject, ref, watch, onMounted } from 'vue'
import AdapterPanel from './components/AdapterPanel.vue'

interface GuiConfig { aiConfigured: boolean; fileType: string }
const config = inject<GuiConfig>('guiConfig')!

const STORAGE_KEY = 'ai-request-guard-theme'
const theme = ref<'dark' | 'light'>('dark')

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') theme.value = saved
  document.documentElement.setAttribute('data-theme', theme.value)
})

watch(theme, (val) => {
  document.documentElement.setAttribute('data-theme', val)
  localStorage.setItem(STORAGE_KEY, val)
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="brand-name">AIRequestGuard</span>
          <span class="brand-sub">Dev Tools</span>
        </div>
        <div class="header-meta">
          <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切换亮色模式' : '切换暗色模式'">
            <!-- sun icon (shown in dark mode → click to go light) -->
            <svg v-if="theme === 'dark'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <!-- moon icon (shown in light mode → click to go dark) -->
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <span class="env-badge">dev only</span>
        </div>
      </div>
      <nav class="tab-nav">
        <button class="tab-btn active">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          Adapter 生成
        </button>
      </nav>
    </header>

    <main class="content">
      <AdapterPanel :config="config" />
    </main>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:          #0c0c10;
  --bg-surface:  #131318;
  --bg-raised:   #1a1a22;
  --bg-input:    #0f0f14;
  --border:      #1e1e28;
  --border-sub:  #252530;
  --text:        #e8e8f0;
  --text-muted:  #7878a0;
  --text-faint:  #3a3a50;
  --accent:      #7c7cff;
  --accent-dim:  rgba(124,124,255,.12);
  --accent-ring: rgba(124,124,255,.2);
  --green:       #22c55e;
  --green-dim:   rgba(34,197,94,.1);
  --amber:       #f59e0b;
  --amber-dim:   rgba(245,158,11,.1);
  --red:         #f87171;
  --red-dim:     rgba(248,113,113,.1);
  --slate:       #94a3b8;
  --slate-dim:   rgba(148,163,184,.07);
  --radius:      8px;
  --radius-lg:   12px;
  --shadow:      0 4px 24px rgba(0,0,0,.4);
}

[data-theme="light"] {
  --bg:          #f5f5f7;
  --bg-surface:  #ffffff;
  --bg-raised:   #f0f0f5;
  --bg-input:    #f8f8fc;
  --border:      #e2e2ea;
  --border-sub:  #d4d4e0;
  --text:        #1a1a2e;
  --text-muted:  #606080;
  --text-faint:  #b0b0c8;
  --accent:      #5b5bff;
  --accent-dim:  rgba(91,91,255,.08);
  --accent-ring: rgba(91,91,255,.2);
  --green:       #16a34a;
  --green-dim:   rgba(22,163,74,.1);
  --amber:       #d97706;
  --amber-dim:   rgba(217,119,6,.1);
  --red:         #dc2626;
  --red-dim:     rgba(220,38,38,.1);
  --slate:       #64748b;
  --slate-dim:   rgba(100,116,139,.07);
  --shadow:      0 4px 24px rgba(0,0,0,.08);
}

html, body, #app { height: 100%; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background .2s, color .2s;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-sub); border-radius: 3px; }

/* App shell */
.app { display: flex; flex-direction: column; min-height: 100vh; }

/* Header */
.header {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background .2s, border-color .2s;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px 0;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-icon {
  width: 30px; height: 30px;
  background: var(--accent-dim);
  border: 1px solid rgba(124,124,255,.25);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}
.brand-name { font-size: 15px; font-weight: 600; color: var(--text); letter-spacing: -.2px; }
.brand-sub {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-raised);
  border: 1px solid var(--border-sub);
  border-radius: 20px;
  padding: 2px 8px;
}
.env-badge {
  font-size: 10px;
  color: var(--amber);
  background: var(--amber-dim);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 20px;
  padding: 2px 9px;
  font-weight: 500;
}
.header-meta { display: flex; align-items: center; gap: 10px; }

/* Theme toggle */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-sub);
  border-radius: 8px;
  background: var(--bg-raised);
  color: var(--text-muted);
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
  flex-shrink: 0;
}
.theme-toggle:hover { color: var(--accent); border-color: var(--accent-ring); }

/* Tab nav */
.tab-nav {
  display: flex;
  padding: 0 28px;
  gap: 4px;
  margin-top: 10px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color .15s;
  margin-bottom: -1px;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-warn {
  font-size: 10px;
  color: var(--amber);
  background: var(--amber-dim);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 20px;
  padding: 1px 7px;
  font-weight: 500;
}

/* Content */
.content { flex: 1; overflow: auto; padding: 28px; max-width: 1100px; width: 100%; margin: 0 auto; }
</style>
