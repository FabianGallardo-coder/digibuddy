---
title: Home
layout: home
nav_order: 1
icon: 🏠
description: "Desktop Digimon pet for tuipet that walks your screen and chats with your local LLM"
---

<section class="hero">
  <div class="container hero__grid">
    <div>
      <p class="eyebrow">🐾 Desktop pet · Open source</p>
      <h1>Your Digimon lives <em>on your screen</em></h1>
      <p class="hero__lead">
        digibuddy wanders your desktop, answers with a local LLM on one click,
        and watches your tuipet save — <strong>strictly read-only</strong>.
      </p>
      <div class="hero__actions">
        <a class="btn btn-primary btn-lg" href="https://github.com/FabianGallardo-coder/digibuddy/releases/latest">⬇️ Download</a>
        <a class="btn btn-lg" href="https://github.com/FabianGallardo-coder/digibuddy">View source</a>
      </div>
      <p class="hero__meta">
        <span>Windows · macOS · Linux</span>
        <span>Powered by Ollama</span>
        <span>MIT</span>
      </p>
    </div>
    <div class="window">
      <div class="window__bar">
        <span class="window__dot" aria-hidden="true"></span>
        <span class="window__dot" aria-hidden="true"></span>
        <span class="window__dot" aria-hidden="true"></span>
        <span class="window__title">digibuddy</span>
      </div>
      <div class="window__media">
        <img src="https://raw.githubusercontent.com/FabianGallardo-coder/digibuddy/Master/media/demo.gif"
             alt="digibuddy walking across a desktop, opening the chat and answering from a local model" width="420" height="540">
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section__head">
      <h2>Built like a Tamagotchi, grounded like a wiki</h2>
      <p>A toy that behaves — with the engineering of a real desktop app.</p>
    </div>
    <div class="feature-grid">
      <article class="feature">
        <span class="feature__icon" aria-hidden="true">🚶</span>
        <h3>Walks your screen</h3>
        <p>Drag it anywhere, always on top. Right-click for Status, Pomodoro, Walk, Reminders and Quit.</p>
      </article>
      <article class="feature">
        <span class="feature__icon" aria-hidden="true">🧠</span>
        <h3>Local LLM chat</h3>
        <p>One click opens a chat powered by Ollama on your machine — 1,548 Digimon facts injected so it never invents evolution rules.</p>
      </article>
      <article class="feature">
        <span class="feature__icon" aria-hidden="true">🛡️</span>
        <h3>Read-only save</h3>
        <p>A 1-second watcher reacts to hatches, evolutions and battles. It never writes your <code>save.json</code>.</p>
      </article>
      <article class="feature">
        <span class="feature__icon" aria-hidden="true">🔓</span>
        <h3>MIT open source</h3>
        <p>No telemetry, no accounts, no cloud. Inspect it, fork it, build it in minutes.</p>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section__head">
      <h2>Documentation</h2>
      <p>Everything from first install to the Rust internals.</p>
    </div>
    <div class="doc-grid">
{% assign nav_pages = site.pages | where_exp: "p", "p.nav_order" | sort: "nav_order" %}
{% for p in nav_pages %}
{% unless p.url == page.url %}
<a class="doc-card" href="{{ p.url | relative_url }}">
  <span class="doc-card__icon" aria-hidden="true">{{ p.icon }}</span>
  <span>
    <span class="doc-card__title">{{ p.title }}</span>
    <span class="doc-card__desc">{{ p.description }}</span>
  </span>
  <span class="doc-card__arrow" aria-hidden="true">→</span>
</a>
{% endunless %}
{% endfor %}
    </div>
  </div>
</section>

<section class="cta-band">
  <h2>Ready to adopt your Digimon?</h2>
  <p>Installers for every platform are one click away — chat needs a local Ollama, everything else works out of the box.</p>
  <div class="hero__actions">
    <a class="btn btn-primary btn-lg" href="https://github.com/FabianGallardo-coder/digibuddy/releases/latest">⬇️ Get digibuddy</a>
    <a class="btn btn-lg" href="https://github.com/FabianGallardo-coder/digibuddy/stargazers">★ Star on GitHub</a>
  </div>
</section>
