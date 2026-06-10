# Guia de Utilização — VanillaTour (`Tour.js`)

Motor de tour guiado em Vanilla JavaScript. **O tour só inicia quando chamado explicitamente** — não há auto-start nem validação de login/sessão.

## Início rápido

```html
<!-- Template Django — apenas importa o módulo -->
<script type="module">
  import '../static/js/Tour/home-tour-config.js';
</script>
```

O botão **?** (canto inferior esquerdo) aparece automaticamente se `showHelpButton: true`. O usuário clica para iniciar.

---

## Passo a passo — criar um tour

### 1. Copiar o template

```
novo-tour-config.js  →  minha-tela-tour-config.js
```

### 2. Marcar elementos no HTML

```html
<div class="card" data-tour="painel-indicadores">...</div>
<button id="ConsultaListaOrcamento-consultar">Consultar</button>
```

### 3. Configurar passos e posicionamento

```javascript
// Padrão vertical (acima/abaixo na zona)
{ element: '[data-tour="x"]', quadrant: 'top-right' }

// Lateral (esquerda/direita) — única customização de eixo
{ element: '[data-tour="x"]', quadrant: 'top-right', split: 'h' }

// Centralizado (legado)
{ element: '[data-tour="x"]', position: 'bottom' }
```

### 4. Registrar e exportar triggers

```javascript
export const minhaTelaTour = new VanillaTour(config);
TourRegistry.register('minha-tela', minhaTelaTour);

export const { start: startMinhaTelaTour, bindTrigger: bindMinhaTelaTourTrigger } =
  createTourTrigger(minhaTelaTour);
```

### 5. Importar na página

```html
<script type="module">
  import '../static/js/Tour/minha-tela-tour-config.js';
</script>
```

### 6. (Opcional) Botão customizado

```javascript
import { bindMinhaTelaTourTrigger } from './minha-tela-tour-config.js';
bindMinhaTelaTourTrigger('#btn-ver-tour');
```

---

## Posicionamento

```
        top-left      |  top-right
        --------------+--------------
        bottom-left   |  bottom-right
```

| Sintaxe | Comportamento |
|---------|---------------|
| `quadrant: 'top-right'` | Tooltip acima/abaixo (split **v** — padrão) |
| `quadrant: 'top-right', split: 'h'` | Tooltip à esquerda/direita |
| `quadrant: 'top-right-h'` | Atalho para split horizontal |
| `position: 'bottom'` | Centralizado abaixo do elemento |

---

## Customizações

### Cores globais

```javascript
settings: {
  colors: {
    primary: '#75c46a',
    overlay: 'rgba(0, 0, 0, 0.75)',
    spotlightBorder: '#75c46a',
    footer: '#75c46a'
  }
}
```

### Margem e offset por passo

```javascript
{
  element: '[data-tour="x"]',
  quadrant: 'bottom-right',
  margin: 20,
  offsetX: -10,
  offsetY: 8
}
```

### Ajuste por zona (settings)

```javascript
settings: {
  quadrants: {
    'top-left': { margin: 24, offsetY: 4 }
  }
}
```

### Passo com interação

```javascript
{
  element: '#btn-consultar',
  quadrant: 'top-right',
  split: 'h',
  allowInteraction: true
}
```

### Passo condicional

```javascript
{
  element: '[data-tour="resultados"]',
  position: 'bottom',
  beforeShow: () => document.querySelector('#lista')?.children.length > 0
}
```

### Menu lateral

```javascript
{
  element: '[data-tour="menu-cadastros"]',
  quadrant: 'top-right',
  split: 'h',
  isMenu: true,
  scroll: false,
  action: () => expandMenu('menu-cadastros')
}
// settings: { onLeaveMenu: collapseAllMenus }
```

### Modal (action + onExit)

```javascript
{
  element: '#modal .modal-dialog',
  position: 'bottom',
  actionMaxWait: 500,
  action: () => $('#modal').modal('show'),
  onExit: () => $('#modal').modal('hide')
}
```

---

## API

### `VanillaTour`

| Método | Descrição |
|--------|-----------|
| `start()` | Inicia o tour |
| `next()` / `prev()` | Navega entre passos |
| `stop()` | Encerra o tour |
| `destroy()` | Remove DOM e listeners |

Teclado: `→` próximo · `←` voltar · `Esc` sair

### `createTourTrigger(tour)`

```javascript
const { start, bindTrigger } = createTourTrigger(homeTour);
bindTrigger('#btn-ver-tour');
start();
```

### `TourRegistry`

```javascript
TourRegistry.register('home', homeTour);
TourRegistry.start('home');
```

---

## Propriedades do passo

| Propriedade | Descrição |
|-------------|-----------|
| `welcome` | Modal centralizado |
| `element` | Seletor CSS |
| `quadrant` | `top-right` \| `top-left` \| `bottom-left` \| `bottom-right` |
| `split` | `'h'` para lateral (padrão é vertical) |
| `position` | `'top'` \| `'bottom'` centralizado |
| `margin`, `offsetX`, `offsetY` | Ajuste fino |
| `allowInteraction` | Permite clicar no alvo |
| `beforeShow` | `() => boolean` — pula se `false` |
| `action` / `onExit` | Abrir/fechar UI |
| `isMenu` | Integra com `onLeaveMenu` |
| `scroll` | Scroll até o elemento (padrão: `true`) |
| `animate` | Anima spotlight (padrão: `true`) |
| `actionMaxWait` | Espera máx. em ms (padrão: `200`) |

---

## Settings globais

| Setting | Padrão | Descrição |
|---------|--------|-----------|
| `padding` | `10` | Margem do spotlight |
| `showHelpButton` | `true` | Botão ? visível ao carregar |
| `lockScroll` | `true` | Bloqueia scroll durante o tour |
| `colors` | `TOUR_COLORS` | Paleta customizada |
| `quadrants` | — | Defaults por zona |
| `onLeaveMenu` | — | Callback ao sair de passo de menu |

---

## Documentação visual

Abra `tour-posicionamento.html` no navegador para o guia interativo com diagrama e código do passo.
