# Guia: ligar as rotas /api no site da Vercel

Até agora, no site publicado (https://grupoazevedoalimentos.vercel.app), tudo que chamava `/api/...`
dava erro 404: envio de e-mail, teste de push, chave VAPID, IA (Gemini) e o disparo manual de
contas a pagar. Agora essas rotas viraram "funções" da Vercel (pasta `api/`).

Para elas funcionarem, a Vercel precisa de algumas **variáveis de ambiente** (senhas e chaves que
ficam guardadas na Vercel, nunca no código). **Configure tudo abaixo ANTES de enviar o código
(`git push`)**, porque a Vercel só lê as variáveis quando faz um novo deploy.

Todas as rotas agora exigem que a pessoa esteja logada no sistema. O disparo manual do relatório
de contas a pagar e o teste de push para todos os aparelhos só funcionam para quem é **ADMIN**.

---

## Passo 1: abrir a tela de variáveis da Vercel

1. Entre em https://vercel.com/dashboard e faça login.
2. Clique no projeto do site (**grupoazevedoalimentos** ou o nome que aparecer).
3. No menu de cima, clique em **Settings**.
4. No menu da esquerda, clique em **Environment Variables**.

Para **cada** variável da tabela abaixo:

1. Em **Key**, escreva o nome exatamente como está na tabela (letras maiúsculas).
2. Em **Value**, cole o valor.
3. Em **Environments**, deixe marcado **Production** (pode marcar **Preview** também).
4. Ligue a opção **Sensitive** (assim ninguém consegue ver o valor depois).
5. Clique em **Save**.

---

## Passo 2: as variáveis

| Nome (Key) | O que colar em Value | Obrigatória? |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | O conteúdo **inteiro** do arquivo JSON da conta de serviço do Firebase (o mesmo que você colou no GitHub para a notificação de hora em hora) | Sim |
| `VAPID_PUBLIC_KEY` | A **mesma** chave pública VAPID que está no segredo do GitHub | Sim |
| `VAPID_PRIVATE_KEY` | A **mesma** chave privada VAPID que está no segredo do GitHub | Sim |
| `VAPID_SUBJECT` | `mailto:rennaninacio0003@gmail.com` | Não |
| `GEMINI_API_KEY` | Sua chave da IA do Google | Só se usar a IA |
| `RESEND_API_KEY` | Chave do Resend (envio de e-mail) | Para e-mail (Resend **ou** SMTP) |
| `RESEND_FROM` | Remetente, ex.: `Grupo Azevedo <relatorios@seudominio.com.br>` | Não |
| `SMTP_HOST` | ex.: `smtp.gmail.com` | Para e-mail via SMTP |
| `SMTP_PORT` | ex.: `465` | Para e-mail via SMTP |
| `SMTP_USER` | O e-mail que vai enviar | Para e-mail via SMTP |
| `SMTP_PASS` | A "senha de app" desse e-mail | Para e-mail via SMTP |

### Onde encontrar cada valor

**FIREBASE_SERVICE_ACCOUNT**
- É o arquivo `.json` que você baixou do Firebase (está na sua pasta **Downloads**, com um nome
  parecido com `gen-lang-client-0790951913-....json`).
- Abra o arquivo com o **TextEdit** (clique com o botão direito > Abrir com > TextEdit),
  aperte **Cmd+A** para selecionar tudo, **Cmd+C** para copiar e cole no campo Value.
- Se não achar o arquivo, gere outro em:
  https://console.firebase.google.com/project/gen-lang-client-0790951913/settings/serviceaccounts/adminsdk
  > botão **Gerar nova chave privada**.
- Nunca mande esse arquivo para ninguém e nunca coloque ele no GitHub.

**VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY**
- Precisam ser **exatamente as mesmas** que você cadastrou nos segredos do GitHub
  (guia `GUIA_NOTIFICACAO_AGENDADA.md`). Se forem diferentes, os celulares param de receber push.
- O GitHub não mostra o valor de um segredo depois de salvo. Use o mesmo lugar de onde você copiou
  na época (o arquivo `vapid-keys.json` do projeto: `publicKey` é a pública, `privateKey` é a privada).

**GEMINI_API_KEY**
- Crie ou copie em https://aistudio.google.com/apikey (botão **Create API key**).

**RESEND_API_KEY**
- Crie em https://resend.com/api-keys (botão **Create API Key**).

**SMTP (Gmail)**
- `SMTP_PASS` não é a senha normal do Gmail: crie uma "senha de app" em
  https://myaccount.google.com/apppasswords (precisa ter verificação em duas etapas ligada).

---

## Passo 3: enviar o código e publicar

Depois de salvar as variáveis, envie o código para o GitHub. No Terminal, dentro da pasta do projeto:

```bash
git push
```

A Vercel publica sozinha em 1 ou 2 minutos. Acompanhe em https://vercel.com/dashboard >
seu projeto > **Deployments** (o mais recente precisa ficar **Ready**, em verde).

Se você mudar alguma variável depois, ela só vale após um novo deploy: em **Deployments**, clique
nos três pontinhos (**⋯**) do deploy mais recente > **Redeploy**.

---

## Passo 4: conferir se funcionou

1. Abra https://grupoazevedoalimentos.vercel.app/api/health
   Deve aparecer algo assim:
   ```
   {"status":"ok","apiConfigured":true,"vapidConfigured":true,"smtpConfigured":true,"firebaseConfigured":true}
   ```
   - `firebaseConfigured: false` → falta `FIREBASE_SERVICE_ACCOUNT`
   - `vapidConfigured: false` → falta `VAPID_PUBLIC_KEY` ou `VAPID_PRIVATE_KEY`
   - `apiConfigured: false` → falta `GEMINI_API_KEY` (só importa se usar a IA)
   - `smtpConfigured: false` → falta Resend ou SMTP
2. Entre no sistema como ADMIN, abra a central de notificações (o sino) e clique em
   **testar notificação**. O celular cadastrado deve receber o push.
3. Envie um relatório por e-mail pelo sistema e confira a caixa de entrada.

---

## Observações

- A fila de e-mails pelo Firestore (`email_requests`), usada como plano B quando o envio direto
  falha, só é processada quando o `server.ts` está rodando num computador. Na Vercel, o envio é
  sempre pelo caminho direto (`/api/send-email`).
- A notificação de hora em hora continua no GitHub Actions. O disparo pelo navegador de um ADMIN
  não repete a notificação se o GitHub já tiver enviado naquela hora.
