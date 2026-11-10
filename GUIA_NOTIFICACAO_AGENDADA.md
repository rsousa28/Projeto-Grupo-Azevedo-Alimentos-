# Notificação de Contas a Pagar agendada (GitHub Actions)

A notificação de hora em hora de Contas a Pagar roda no GitHub Actions
(`.github/workflows/hourly-payable.yml`), não mais dentro do `server.ts`.
Assim ela chega mesmo com o AI Studio fechado, já que a Vercel só hospeda o frontend.

- Roda toda hora, no minuto 7 (o GitHub pode atrasar alguns minutos).
- Usa o horário de Fortaleza/Mossoró (`America/Fortaleza`) para "hoje", "vencido" e a hora do título.
- Grava a última hora enviada em `system_state/payable_hourly` no Firestore, então nunca envia duas vezes na mesma hora.

## Configuração (uma vez)

### 1. Criar a chave da conta de serviço do Firebase

1. Abra o [Console do Firebase](https://console.firebase.google.com/) e entre no projeto `gen-lang-client-0790951913`.
2. Engrenagem ⚙️ > **Configurações do projeto** > aba **Contas de serviço**.
3. Clique em **Gerar nova chave privada** e baixe o arquivo `.json`.
4. Guarde esse arquivo em lugar seguro e **não** coloque no repositório.

### 2. Cadastrar os segredos no GitHub

No repositório: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.

| Nome | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | O conteúdo inteiro do arquivo `.json` do passo 1 |
| `VAPID_PUBLIC_KEY` | A chave pública VAPID usada pelo app |
| `VAPID_PRIVATE_KEY` | A chave privada VAPID usada pelo app |
| `VAPID_SUBJECT` | (opcional) ex.: `mailto:seu-email@exemplo.com` |

As chaves VAPID precisam ser **as mesmas** com que os celulares se cadastraram, senão o envio falha
e o cadastro do celular é removido.

### 3. Testar

1. Aba **Actions** > **Hourly Accounts Payable notification** > **Run workflow**.
2. Escolha `dry-run` primeiro: ele só mostra a mensagem no log, sem enviar nada.
3. Se a mensagem estiver certa, rode com `force` para enviar uma notificação de teste agora.

Depois disso o agendamento roda sozinho.

## Rodar localmente

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat caminho/para/chave.json)" npx tsx scripts/hourly-payable.ts --dry-run
```

Flags: `--dry-run` (só mostra), `--force` (envia mesmo se a hora já foi enviada).

## Observações

- O GitHub pausa workflows agendados de repositórios **públicos** sem atividade por 60 dias.
  Se parar, basta reativar na aba Actions ou fazer qualquer commit.
- O botão de teste no app (`/api/notifications/trigger-hourly-payable`) continua usando o `server.ts`
  e envia na hora para todos os celulares.
