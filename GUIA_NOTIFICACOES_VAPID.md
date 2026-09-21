# 📱 Guia Completo: Configuração de Notificações Push em Segundo Plano (VAPID & PWA)
## Sistema de Gestão Operacional e Financeira — Grupo Azevedo

Este documento é o guia oficial e definitivo para configurar, testar e garantir que as **Notificações Push em Segundo Plano (Background)** funcionem perfeitamente no seu smartphone (iOS e Android) e computador, **mesmo com o aplicativo fechado e a tela bloqueada**.

---

## 1. O que é VAPID e como funciona o envio em segundo plano?

**VAPID** (*Voluntary Application Server Identification* — RFC 8292) é o padrão de segurança da Web para envio de notificações push nativas.

### Como funciona o fluxo de ponta a ponta:
1. **No Dispositivo (Cliente)**: O usuário autoriza as notificações no PWA. O navegador registra o `Service Worker` (`/public/sw.js`) e solicita ao serviço de push (Google FCM para Android/Chrome ou Apple APNs para iOS/Safari) um endereço de entrega exclusivo chamado **Push Subscription Endpoint**.
2. **No Servidor (Backend)**: O endpoint e as chaves de criptografia do dispositivo são enviados para o servidor (`POST /api/push/subscribe`) e salvos no banco de dados Firestore na coleção `push_subscriptions`.
3. **Disparo em Segundo Plano**: Quando o servidor precisa notificar (como no robô horário de contas a pagar das 08h às 22h ou em um checklist atrasado), ele usa a **Chave Privada VAPID** para assinar digitalmente a mensagem e envia diretamente para o serviço da Apple ou Google.
4. **Entrega Silenciosa**: Os servidores da Apple/Google acordam o sistema operacional do celular, que acorda o **Service Worker** em segundo plano. O Service Worker exibe o banner nativo na tela de bloqueio com som e vibração, **sem que o aplicativo precise estar aberto**.

---

## 2. Configuração das Chaves VAPID no Servidor

O sistema possui gerenciamento automático de chaves VAPID, mas você também pode definir suas próprias chaves fixas.

### Onde ficam as chaves no projeto:
1. **Arquivo Local Automático**: O servidor gera e salva automaticamente as chaves no arquivo `/vapid-keys.json`:
   ```json
   {
     "publicKey": "BICKQSsomQNxolxMgOH8zuTiBR0qEuFX6zSUbt462NkBtbqZ3gO2DHc6IJizJgZupwKk6o-64Jdr04aL5QMHvYk",
     "privateKey": "..."
   }
   ```
2. **Variáveis de Ambiente (`.env` ou Configurações do Servidor)**:
   Para fixar suas chaves permanentemente (recomendado para produção contínua):
   ```env
   VAPID_PUBLIC_KEY="sua_chave_publica_aqui"
   VAPID_PRIVATE_KEY="sua_chave_privada_aqui"
   VAPID_SUBJECT="mailto:rennaninacio0003@gmail.com"
   ```

### Como gerar um novo par de chaves VAPID (se desejar renovar):
Você pode gerar um novo par de chaves a qualquer momento pelo terminal:
```bash
npx web-push generate-vapid-keys
```
Ou no **Firebase Console**:
1. Acesse o [Console do Firebase](https://console.firebase.google.com).
2. Vá em **Configurações do Projeto** (ícone de engrenagem) > aba **Cloud Messaging**.
3. Na seção **Configuração da Web** > **Certificados do Web Push**, clique em **Gerar par de chaves**.
4. Copie a chave pública gerada.

---

## 3. Passo a Passo Obrigatório para Apple (iPhone / iPad / iOS)

> ⚠️ **IMPORTANTE**: No iOS (a partir da versão 16.4), a Apple **BLOQUEIA** notificações push em abas comuns do Safari. As notificações **SÓ FUNCIONAM** se o aplicativo for instalado como PWA na Tela de Início!

### Passo 1: Instalar o PWA na Tela de Início
1. Abra o link do sistema no **Safari** (ex: `https://ais-dev-...run.app` ou seu domínio próprio).
2. Toque no botão de **Compartilhar** do Safari (ícone do quadrado com a seta para cima, na barra inferior do iPhone).
3. Role a lista e toque em **"Adicionar à Tela de Início"** (ícone com o sinal de `+`).
4. Confirme o nome (ex: "Grupo AZ") e toque em **Adicionar** no canto superior direito.

### Passo 2: Abrir pelo Ícone da Tela de Início e Autorizar
1. Feche o Safari e localize o novo ícone do **Grupo AZ** na tela inicial do iPhone.
2. Abra o aplicativo pelo ícone.
3. Faça login com suas credenciais.
4. Toque no **ícone do sino** (canto superior direito) para abrir a Central de Notificações.
5. Toque no botão **"Ativar Notificações Push"** e, no diálogo nativo do iOS, toque em **"Permitir"**.

### Passo 3: Ajustes de Sistema do iOS
1. No iPhone, abra **Ajustes** > role até **Notificações**.
2. Localize o aplicativo **Grupo AZ** (ou o Safari/Web App).
3. Certifique-se de que estão marcados:
   - ✅ **Permitir Notificações** (Ativado)
   - ✅ **Tela Bloqueada**, **Central de Notificações** e **Banners**
   - ✅ **Sons** e **Avisos**

---

## 4. Passo a Passo para Android (Samsung, Motorola, Xiaomi, etc.)

No Android, as notificações funcionam muito bem tanto no navegador Chrome quanto no PWA instalado, mas há um ajuste crítico de bateria.

### Passo 1: Instalar o PWA e Conceder Permissões
1. Abra o sistema no **Google Chrome**.
2. Toque no banner inferior **"Instalar Aplicativo"** ou no menu de 3 pontos do Chrome > **"Instalar aplicativo"** / **"Adicionar à tela inicial"**.
3. Abra o app instalado e faça login.
4. Abra o sininho e clique em **"Ativar Notificações"** > toque em **"Permitir"**.

### Passo 2: Desativar Otimização de Bateria (Crítico para 2º Plano)
Fabricantes de Android (especialmente Samsung e Xiaomi) possuem um gerenciador agressivo que "congela" aplicativos em segundo plano para economizar bateria. Para garantir que o push toque imediatamente:
1. Abra **Configurações do Android** > **Aplicativos**.
2. Selecione o aplicativo **Grupo AZ** (ou o **Chrome**, se estiver usando pelo navegador).
3. Toque em **Bateria** (ou *Uso da Bateria*).
4. Altere a opção de "Otimizado" para **"Sem restrições"** (ou *Não otimizar*).
5. Em **Notificações**, certifique-se de que todas as categorias estão ativadas com som/vibração.

---

## 5. Como o Servidor Agenda os Envios Automáticos

No arquivo `server.ts`, há um robô que roda continuamente no Cloud Run:

```typescript
// Disparo automático a cada 60 minutos
setInterval(async () => {
  const currentHour = new Date().getHours();
  // Roda entre as 08:00h e as 22:00h (horário comercial)
  if (currentHour >= 8 && currentHour <= 22) {
    await executeHourlyAccountsPayableCheck(false);
  }
}, 60 * 60 * 1000);
```

### O que o robô faz:
1. Consulta no Firestore as contas a pagar de todas as 3 marcas ativas:
   - 📍 **B32 (Mossoró)**
   - 📍 **B28 (Bebelu Rio Mar)**
   - 📍 **Vero Pasta**
2. Calcula o total de boletos vencidos, boletos com vencimento para hoje e valor total do grupo.
3. Busca todos os aparelhos cadastrados na coleção `push_subscriptions`.
4. Dispara a notificação push assinada com a chave VAPID diretamente para cada aparelho via `webpush.sendNotification()`.

---

## 6. Como Testar se o seu Celular está Recebendo em 2º Plano

Você pode fazer um teste imediato sem esperar o próximo horário comercial:

### Teste Rápido via Central de Notificações:
1. Abra o app no celular e abra a **Central de Notificações** (ícone do sino).
2. Na aba **Configurações**, clique em **"Disparar Relatório Contas a Pagar Agora"** (disponível para Administradores e Financeiro).
3. Ou use o novo botão **"Testar Notificação com Delay (5s)"**:
   - Toque no botão.
   - **Bloqueie a tela do celular imediatamente**.
   - Em 5 segundos, o celular vibrará e exibirá a notificação na tela de bloqueio!

### Teste via Linha de Comando / Terminal:
Você também pode disparar um teste direto pelo servidor:
```bash
curl -X POST http://localhost:3000/api/notifications/trigger-hourly-payable
```
Isso enviará a notificação push para todos os aparelhos registrados no banco de dados.

---

## 7. Tabela de Resolução de Problemas (Troubleshooting)

| Problema | Causa Mais Frequente | Como Resolver |
| :--- | :--- | :--- |
| **iPhone não mostra o botão de notificação** | App aberto em aba comum do Safari | É obrigatório adicionar à Tela de Início pelo botão Compartilhar > Adicionar à Tela de Início. |
| **Notificação só chega quando abro o app** | Otimização de bateria do Android ativa | Vá em Configurações > Aplicativos > Grupo AZ / Chrome > Bateria > "Sem restrições". |
| **Erro "PushManager not found"** | Navegador antigo ou modo anônimo | Web Push não funciona em navegação anônima/privada. Use a navegação normal. |
| **Status "Permissão Negada"** | Usuário clicou em "Bloquear" anteriormente | Toque no ícone de cadeado na barra de endereços (ou Ajustes do iPhone/Android) e redefina a permissão para "Permitir". |
| **Notificação sem som no iOS** | Modo Não Perturbe ou Chave de Silencioso ativa | Verifique a chave física/botão de ação do iPhone e adicione o Grupo AZ à lista de exceções do Foco/Não Perturbe. |

---

> **Suporte Técnico**: Desenvolvido para Grupo Azevedo Alimentos. Em caso de dúvidas, verifique as configurações em `server.ts` e `src/services/NotificationService.ts`.
