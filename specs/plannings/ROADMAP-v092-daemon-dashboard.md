# Roadmap v0.9.2 - Daemon + Dashboard

**Código:** `feat/daemon-dashboard`  
**Versão:** v0.9.2  
**Data Planejada:** 2026-03-XX  
**Status:** 📋 Planejado

**Dependência:** v0.9.1 (Validation Phase)

---

> **Nota:** A versão de validação (v0.9.1) antecede esta. Veja [ROADMAP-v091-validation.md](ROADMAP-v091-validation.md)

---

## Escopo

Sistema de auto-treinamento contínuo com dashboards para monitoramento.

---

## Objetivos

1. **Daemon** - Serviço que roda em background e gerencia o pipeline automaticamente
2. **Auto-Train** - Treinamento incremental quando novas queries chegam
3. **Hot-Reload** - Recarrega modelo sem interrupção
4. **CLI Dashboard** - Métricas em tabelas no terminal
5. **HTML Report** - Relatório visual para apresentar ao time

---

## 1. Daemon

### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Daemon Running                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────────┐     ┌──────────────┐               │
│   │  Collector   │────▶│  Buffer      │               │
│   │  (periodic)  │     │  (queries)   │               │
│   └──────────────┘     └──────┬───────┘               │
│                                │                       │
│                                ▼                       │
│   ┌──────────────┐     ┌──────────────┐               │
│   │  Threshold   │◀────│  Condition   │               │
│   │  Checker     │     │  (N queries) │               │
│   └──────┬───────┘     └──────────────┘               │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐                                        │
│   │  Trainer     │────▶ Novo modelo                        │
│   │  (incremental)│                                       │
│   └──────────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐                                        │
│   │  Hot Reload │────▶ Modelo em produção                 │
│   └──────────────┘                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### CLI

```bash
# Iniciar daemon
sql-sage daemon start \
  --host localhost \
  --database myapp \
  --min-queries 50 \
  --interval 3600

# Parar daemon
sql-sage daemon stop

# Reiniciar
sql-sage daemon restart

# Status
sql-sage daemon status

# Train manual
sql-sage daemon train-now

# Ver logs
sql-sage daemon logs --lines 100
```

### Configuração

```yaml
# .sqlsage/daemon.yml
daemon:
  enabled: true
  pidFile: /tmp/sql-sage-daemon.pid
  logFile: /var/log/sql-sage/daemon.log
  
collect:
  interval: 3600        # segundos (1 hora)
  minQueries: 50        # queries mínimas para treinar
  minTimeMs: 100       # tempo mínimo
  sources:
    - perf-schema
  
train:
  epochs: 20
  batchSize: 32
  earlyStopping: true
  patience: 10
  threshold:
    method: percentile
    p: 90
    
model:
  hotReload: true
  backupPrevious: true
  dir: ./models
  
monitor:
  alertsEnabled: true
  alertOn:
    - accuracyDrop
    - slowQueriesIncrease
    - responseTimeDegradation
```

---

## 2. Auto-Train

### Condições de Treinamento

```typescript
interface ITrainCondition {
  minQueries: number;      // mínimo de novas queries
  minTimeSinceLast: number; // segundos desde último treino
  minAccuracyDrop: number; // queda de accuracy que dispara treino
}

const defaultCondition: ITrainCondition = {
  minQueries: 50,
  minTimeSinceLast: 3600,  // 1 hora
  minAccuracyDrop: 0.05,   // 5%
};
```

### Fluxo de Treinamento

```
1. Collector coleta novas queries
2. Buffer armazena queries
3. Verifica condições:
   - Se minQueries atingidas OU
   - Se minTimeSinceLast excedido OU
   - Se accuracy caiu
4. Se condição satisfeita:
   a. Salvar modelo atual (backup)
   b. Carregar dados do buffer
   c. Treinar novo modelo
   d. Validar métricas
   e. Se métricas OK → hot-reload
   f. Se métricas piores → rollback
5. Limpar buffer
```

### Hot-Reload

```typescript
class ModelHotReloader {
  private currentModel: tf.LayersModel | null = null;
  
  async reload(newModelPath: string): Promise<void> {
    // 1. Backup modelo atual
    if (this.currentModel) {
      await this.backup();
    }
    
    // 2. Carregar novo modelo
    const newModel = await tf.loadLayersModel(newModelPath);
    
    // 3. Validar novo modelo
    const metrics = await this.validate(newModel);
    if (metrics.accuracy < this.currentMetrics.accuracy - 0.05) {
      console.warn('[Daemon] New model worse, rolling back');
      await this.rollback();
      return;
    }
    
    // 4. Substituir
    this.currentModel.dispose();
    this.currentModel = newModel;
    
    console.log('[Daemon] Model hot-reloaded successfully');
  }
}
```

---

## 3. CLI Dashboard

### Status do Daemon

```bash
sql-sage daemon status
```

**Output:**
```
┌─────────────────────────────────────────────────────────┐
│  SQL-SAGE Daemon Status                                 │
├──────────────────┬────────────────────────────────────┤
│ Status           │ 🟢 Running                           │
│ Uptime           │ 2d 14h 32m                          │
│ Last Collect     │ 2026-03-14 10:30:00                │
│ Last Train       │ 2026-03-14 08:00:00                │
│ Queries Buffer   │ 47                                  │
│ Model Version    │ v1772987881334                      │
└──────────────────┴────────────────────────────────────┘
```

### Métricas em Tempo Real

```bash
sql-sage daemon metrics
```

**Output:**
```
┌──────────────────────────────────────────────────────────┐
│  Performance Metrics - Last 24h                           │
├────────────────────┬──────────┬──────────┬───────────────┤
│ Metric             │ Current  │ Previous │ Change        │
├────────────────────┼──────────┼──────────┼───────────────┤
│ Avg Response Time  │ 45.2ms   │ 42.1ms   │ 🔴 +7.4%      │
│ Slow Queries       │ 12       │ 8        │ 🔴 +50%       │
│ Model Accuracy     │ 78%      │ 75%      │ 🟢 +3%        │
│ Queries Analyzed   │ 1,247    │ 1,102    │ 🟢 +13%       │
└────────────────────┴──────────┴──────────┴───────────────┘
```

### Alertas Ativos

```bash
sql-sage daemon alerts
```

**Output:**
```
⚠️  ALERTAS ATIVOS

[🔴 CRITICAL] Response time degraded +25% (last hour)
[🟡 WARNING]  Slow queries increased from 8 to 15
[🟡 WARNING]  Model accuracy dropped below 70%
```

### Histórico de Treinos

```bash
sql-sage daemon history
```

**Output:**
```
┌─────────────────────────────────────────────────────────┐
│  Training History                                        │
├──────────────┬──────────┬──────────┬───────┬───────────┤
│ Date         │ Epochs   │ Accuracy │ Loss  │ Status    │
├──────────────┼──────────┼──────────┼───────┼───────────┤
│ 2026-03-14  │ 50       │ 78%      │ 0.45  │ 🟢 Active │
│ 2026-03-13  │ 50       │ 75%      │ 0.52  │ ⚪ Saved  │
│ 2026-03-12  │ 30       │ 71%      │ 0.61  │ ⚪ Saved  │
│ 2026-03-11  │ 50       │ 73%      │ 0.55  │ ⚪ Saved  │
└──────────────┴──────────┴──────────┴───────┴───────────┘
```

---

## 4. HTML Report

### CLI

```bash
# Gerar relatório HTML
sql-sage daemon report --output dashboard.html

# Com período específico
sql-sage daemon report --period 7d --output dashboard.html

# Abrir automaticamente no browser
sql-sage daemon report --open
```

### Estrutura do HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>SQL-Sage Dashboard</title>
  <style>
    /* CSS simples e responsivo */
  </style>
</head>
<body>
  <header>
    <h1>SQL-Sage Dashboard</h1>
    <p>Generated: 2026-03-14 10:00:00</p>
  </header>
  
  <section class="kpis">
    <div class="kpi">
      <h3>Avg Response Time</h3>
      <p class="value">45.2ms</p>
      <p class="change negative">+7.4%</p>
    </div>
    <div class="kpi">
      <h3>Slow Queries</h3>
      <p class="value">12</p>
      <p class="change negative">+50%</p>
    </div>
    <div class="kpi">
      <h3>Model Accuracy</h3>
      <p class="value">78%</p>
      <p class="change positive">+3%</p>
    </div>
  </section>
  
  <section class="charts">
    <h2>Accuracy Over Time</h2>
    <div id="accuracy-chart"></div>
  </section>
  
  <section class="alerts">
    <h2>Alerts</h2>
    <ul>
      <li class="critical">Response time degraded +25%</li>
      <li class="warning">Slow queries increased</li>
    </ul>
  </section>
  
  <section class="training-history">
    <h2>Training History</h2>
    <table>...</table>
  </section>
</body>
</html>
```

### Visual

```
┌─────────────────────────────────────────────────────────┐
│  SQL-Sage Dashboard                    Generated: ...  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐│
│  │ Avg Response  │ │ Slow Queries  │ │ Accuracy      ││
│  │    45.2ms    │ │      12       │ │     78%       ││
│  │   🔴 +7.4%   │ │   🔴 +50%    │ │   🟢 +3%     ││
│  └───────────────┘ └───────────────┘ └───────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Accuracy Over Time                                 ││
│  │  80% ┤                            ╭──╮            ││
│  │  75% ┤                    ╭─────╯  ╰───╮         ││
│  │  70% ┤            ╭──────╯               ╰────     ││
│  │  65% ┤    ──────╯                              ││
│  │      └──────────────────────────────────────────→  ││
│  │       Mar 10   Mar 11   Mar 12   Mar 13   Mar 14││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Alerts                                             ││
│  │  🔴 Response time degraded +25% (last hour)        ││
│  │  🟡 Slow queries increased from 8 to 15            ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Alerts

### Tipos de Alerta

| Tipo | Condição | Severidade |
|------|----------|------------|
| `accuracyDrop` | Accuracy cai > 5% | 🔴 CRITICAL |
| `responseTimeDegradation` | Response time +20% | 🔴 CRITICAL |
| `slowQueriesIncrease` | Slow queries +50% | 🟡 WARNING |
| `modelTrainingFailed` | Treinamento falha | 🔴 CRITICAL |
| `bufferFull` | Buffer > 1000 queries | 🟡 WARNING |

### Configuração de Alertas

```yaml
monitor:
  alertsEnabled: true
  channels:
    - console    # print no terminal
    # Futuro:
    # - email
    # - slack
    # - webhook
    
  rules:
    - name: accuracyDrop
      condition: accuracy < previousAccuracy - 0.05
      severity: critical
      
    - name: responseTimeDegradation
      condition: avgResponseTime > previousAvgTime * 1.2
      severity: critical
      
    - name: slowQueriesIncrease
      condition: slowQueries > previousSlowQueries * 1.5
      severity: warning
```

---

## Estrutura de Arquivos

```
src/
  services/
    daemon/
      index.ts              # CLI commands
      daemon.service.ts    # Orquestrador principal
      collector.ts         # Coleta em background
      trainer.ts           # Treinamento incremental
      hot-reloader.ts      # Recarrega modelo
      monitor/
        metrics.ts         # Coleta métricas
        alerts.ts          # Sistema de alertas
      storage/
        state.ts           # Persiste estado do daemon
        history.ts         # Histórico de treinos
      dashboard/
        cli-table.ts       # CLI dashboard
        html-generator.ts  # Gera HTML
```

---

## Critérios de Aceitação

- [ ] Daemon inicia e roda em background
- [ ] Coleta queries periodicamente
- [ ] Treina automaticamente quando atinge threshold
- [ ] Hot-reload do modelo funciona
- [ ] CLI: `daemon status` mostra informações corretas
- [ ] CLI: `daemon metrics` exibe tabela
- [ ] CLI: `daemon alerts` lista alertas
- [ ] CLI: `daemon report --output` gera HTML
- [ ] Alertas funcionam corretamente
- [ ] Persistência de estado entre reinícios

---

## TDDs Associados

- `specs/tdd-daemon-architecture.md` - Arquitetura do daemon
- `specs/tdd-auto-trainer.md` - Treinamento automático
- `specs/tdd-hot-reload.md` - Hot reload de modelo
- `specs/tdd-cli-dashboard.md` - Dashboard CLI
- `specs/tdd-html-dashboard.md` - Relatório HTML

---

## Dependências

- Consolidated Pipeline (v0.9.0)
- Validation Phase (v0.9.1)

---

## Próxima Versão

[v1.0-beta](ROADMAP-v100-beta.md) - Beta Release
